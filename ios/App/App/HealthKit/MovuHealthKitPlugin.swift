import Capacitor
import Foundation
import HealthKit

@objc(MovuHealthKitPlugin)
public class MovuHealthKitPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is not available on this device")
            return
        }

        healthStore.requestAuthorization(toShare: Set<HKSampleType>(), read: readTypes()) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["requested": success])
        }
    }

    @objc func queryHealthData(_ call: CAPPluginCall) {
        guard
            let startDateString = call.getString("startDate"),
            let endDateString = call.getString("endDate"),
            let startDate = parseIsoDate(startDateString),
            let endDate = parseIsoDate(endDateString)
        else {
            call.reject("startDate and endDate are required ISO strings")
            return
        }

        Task {
            do {
                async let workouts = queryWorkouts(startDate: startDate, endDate: endDate)
                async let sleepRecords = querySleep(startDate: startDate, endDate: endDate)
                async let dailySummaries = queryDailySummaries(startDate: startDate, endDate: endDate)
                async let weightSamples = queryBodyMass(startDate: startDate, endDate: endDate)

                call.resolve([
                    "workouts": try await workouts,
                    "sleepRecords": try await sleepRecords,
                    "dailySummaries": try await dailySummaries,
                    "weightSamples": try await weightSamples,
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private func readTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = [
            HKObjectType.workoutType(),
        ]

        let categoryIdentifiers: [HKCategoryTypeIdentifier] = [.sleepAnalysis]
        for identifier in categoryIdentifiers {
            if let type = HKObjectType.categoryType(forIdentifier: identifier) {
                types.insert(type)
            }
        }

        var quantityIdentifiers: [HKQuantityTypeIdentifier] = [
            .restingHeartRate,
            .heartRateVariabilitySDNN,
            .respiratoryRate,
            .activeEnergyBurned,
            .basalEnergyBurned,
            .appleExerciseTime,
            .vo2Max,
            .stepCount,
            .bodyMass,
        ]

        if #available(iOS 17.0, *) {
            quantityIdentifiers.append(.physicalEffort)
        }

        for identifier in quantityIdentifiers {
            if let type = HKObjectType.quantityType(forIdentifier: identifier) {
                types.insert(type)
            }
        }

        return types
    }

    private func queryWorkouts(startDate: Date, endDate: Date) async throws -> [[String: Any]] {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        let samples: [HKWorkout] = try await querySamples(sampleType: HKObjectType.workoutType(), predicate: predicate)

        return samples.map { workout in
            var row: [String: Any] = [
                "activityType": workoutActivityTypeName(workout.workoutActivityType),
                "startDate": localIsoString(workout.startDate),
                "endDate": localIsoString(workout.endDate),
                "duration": workout.duration / 60.0,
                "sourceName": workout.sourceRevision.source.name,
            ]

            if let energy = workout.totalEnergyBurned {
                row["totalEnergyBurned"] = energy.doubleValue(for: .kilocalorie())
            }

            if let distance = workout.totalDistance {
                row["totalDistance"] = distance.doubleValue(for: .meter())
            }

            return row
        }
    }

    private func querySleep(startDate: Date, endDate: Date) async throws -> [[String: Any]] {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            return []
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        let samples: [HKCategorySample] = try await querySamples(sampleType: sleepType, predicate: predicate)

        return samples.compactMap { sample in
            guard let value = sleepValueName(sample.value) else {
                return nil
            }
            return [
                "value": value,
                "startDate": localIsoString(sample.startDate),
                "endDate": localIsoString(sample.endDate),
            ]
        }
    }

    private func queryDailySummaries(startDate: Date, endDate: Date) async throws -> [String: [String: Any]] {
        var summaries: [String: [String: Any]] = [:]

        func ensureDay(_ key: String) -> String {
            if summaries[key] == nil {
                summaries[key] = ["date": key]
            }
            return key
        }

        let cumulative: [(HKQuantityTypeIdentifier, String, HKUnit)] = [
            (.activeEnergyBurned, "activeEnergyKcal", .kilocalorie()),
            (.basalEnergyBurned, "basalEnergyKcal", .kilocalorie()),
            (.appleExerciseTime, "exerciseMinutes", .minute()),
            (.stepCount, "steps", .count()),
        ]

        for item in cumulative {
            let values = try await queryDailyStatistics(identifier: item.0, startDate: startDate, endDate: endDate, options: .cumulativeSum, unit: item.2)
            for (date, value) in values {
                let key = ensureDay(localDateString(date))
                summaries[key]?[item.1] = value
            }
        }

        var averages: [(HKQuantityTypeIdentifier, String, HKUnit)] = [
            (.restingHeartRate, "restingHeartRate", HKUnit.count().unitDivided(by: .minute())),
            (.heartRateVariabilitySDNN, "hrv", .secondUnit(with: .milli)),
            (.respiratoryRate, "respiratoryRate", HKUnit.count().unitDivided(by: .minute())),
        ]
        if #available(iOS 17.0, *) {
            let physicalEffortUnit = HKUnit
                .kilocalorie()
                .unitDivided(by: .hour())
                .unitDivided(by: .gramUnit(with: .kilo))
            averages.append((.physicalEffort, "physicalEffort", physicalEffortUnit))
        }

        for item in averages {
            let values = try await queryDailyStatistics(identifier: item.0, startDate: startDate, endDate: endDate, options: .discreteAverage, unit: item.2)
            for (date, value) in values {
                let key = ensureDay(localDateString(date))
                summaries[key]?[item.1] = value
            }
        }

        let vo2Values = try await queryLatestQuantityPerDay(identifier: .vo2Max, startDate: startDate, endDate: endDate, unit: HKUnit.literUnit(with: .milli).unitDivided(by: .gramUnit(with: .kilo)).unitDivided(by: .minute()))
        for (dateKey, value) in vo2Values {
            let key = ensureDay(dateKey)
            summaries[key]?["vo2Max"] = value
        }

        return summaries
    }

    private func queryBodyMass(startDate: Date, endDate: Date) async throws -> [[String: Any]] {
        let latest = try await queryLatestQuantityPerDay(identifier: .bodyMass, startDate: startDate, endDate: endDate, unit: .gramUnit(with: .kilo))

        return latest
            .sorted { $0.key < $1.key }
            .map { date, weightKg in
                ["date": date, "weightKg": weightKg]
            }
    }

    private func queryDailyStatistics(identifier: HKQuantityTypeIdentifier, startDate: Date, endDate: Date, options: HKStatisticsOptions, unit: HKUnit) async throws -> [(Date, Double)] {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return []
        }

        return try await withCheckedThrowingContinuation { continuation in
            let calendar = Calendar.current
            let anchorDate = calendar.startOfDay(for: startDate)
            let interval = DateComponents(day: 1)
            let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
            let query = HKStatisticsCollectionQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: options,
                anchorDate: anchorDate,
                intervalComponents: interval
            )

            query.initialResultsHandler = { _, collection, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                var result: [(Date, Double)] = []
                collection?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                    let quantity = options.contains(.cumulativeSum)
                        ? statistics.sumQuantity()
                        : statistics.averageQuantity()
                    if let quantity = quantity {
                        result.append((statistics.startDate, quantity.doubleValue(for: unit)))
                    }
                }
                continuation.resume(returning: result)
            }

            healthStore.execute(query)
        }
    }

    private func queryLatestQuantityPerDay(identifier: HKQuantityTypeIdentifier, startDate: Date, endDate: Date, unit: HKUnit) async throws -> [String: Double] {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return [:]
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        let samples: [HKQuantitySample] = try await querySamples(sampleType: type, predicate: predicate)
        var latest: [String: (date: Date, value: Double)] = [:]

        for sample in samples {
            let key = localDateString(sample.startDate)
            let value = sample.quantity.doubleValue(for: unit)
            if latest[key] == nil || sample.startDate > latest[key]!.date {
                latest[key] = (sample.startDate, value)
            }
        }

        return latest.mapValues { $0.value }
    }

    private func querySamples<T: HKSample>(sampleType: HKSampleType, predicate: NSPredicate) async throws -> [T] {
        try await withCheckedThrowingContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
            let query = HKSampleQuery(sampleType: sampleType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [T]) ?? [])
            }
            healthStore.execute(query)
        }
    }

    private func parseIsoDate(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) {
            return date
        }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }

    private func localIsoString(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = .current
        formatter.formatOptions = [.withInternetDateTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withColonSeparatorInTimeZone]
        return formatter.string(from: date)
    }

    private func localDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = .current
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private func sleepValueName(_ value: Int) -> String? {
        guard let sleepValue = HKCategoryValueSleepAnalysis(rawValue: value) else {
            return nil
        }

        switch sleepValue {
        case .asleepREM:
            return "HKCategoryValueSleepAnalysisAsleepREM"
        case .asleepDeep:
            return "HKCategoryValueSleepAnalysisAsleepDeep"
        case .asleepCore, .asleepUnspecified:
            return "HKCategoryValueSleepAnalysisAsleepCore"
        case .awake:
            return "HKCategoryValueSleepAnalysisAwake"
        default:
            return nil
        }
    }

    private func workoutActivityTypeName(_ value: HKWorkoutActivityType) -> String {
        switch value {
        case .running:
            return "HKWorkoutActivityTypeRunning"
        case .cycling:
            return "HKWorkoutActivityTypeCycling"
        case .walking:
            return "HKWorkoutActivityTypeWalking"
        case .hiking:
            return "HKWorkoutActivityTypeHiking"
        case .functionalStrengthTraining:
            return "HKWorkoutActivityTypeFunctionalStrengthTraining"
        case .traditionalStrengthTraining:
            return "HKWorkoutActivityTypeTraditionalStrengthTraining"
        case .pilates:
            return "HKWorkoutActivityTypePilates"
        case .yoga:
            return "HKWorkoutActivityTypeYoga"
        case .swimming:
            return "HKWorkoutActivityTypeSwimming"
        case .highIntensityIntervalTraining:
            return "HKWorkoutActivityTypeHighIntensityIntervalTraining"
        case .crossTraining:
            return "HKWorkoutActivityTypeCrossTraining"
        case .dance:
            return "HKWorkoutActivityTypeDance"
        case .elliptical:
            return "HKWorkoutActivityTypeElliptical"
        case .rowing:
            return "HKWorkoutActivityTypeRowing"
        case .stairClimbing:
            return "HKWorkoutActivityTypeStairClimbing"
        default:
            return "HKWorkoutActivityTypeOther"
        }
    }
}
