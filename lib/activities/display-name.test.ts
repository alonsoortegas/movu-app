import { describe, expect, it } from 'vitest'
import { formatActivityDisplayName } from './display-name'

describe('formatActivityDisplayName', () => {
  it('maps HealthKit workout enums to friendly workout names', () => {
    expect(formatActivityDisplayName({ activity_name: 'HKWorkoutActivityTypeRunning' })).toBe('Run')
    expect(formatActivityDisplayName({ activity_name: 'HKWorkoutActivityTypeCycling' })).toBe('Ride')
    expect(formatActivityDisplayName({ activity_name: 'HKWorkoutActivityTypeHighIntensityIntervalTraining' })).toBe('HIIT')
    expect(formatActivityDisplayName({ activity_name: 'HKWorkoutActivityTypeFunctionalStrengthTraining' })).toBe('Functional strength')
  })

  it('uses the activity category when HealthKit only reports Other', () => {
    expect(formatActivityDisplayName({
      activity_name: 'HKWorkoutActivityTypeOther',
      activity_category: 'strength',
    })).toBe('Strength')
  })

  it('cleans common slugs without changing intentional manual names', () => {
    expect(formatActivityDisplayName({ activity_name: 'functional-fitness' })).toBe('Functional fitness')
    expect(formatActivityDisplayName({ activity_name: 'weightlifting' })).toBe('Strength training')
    expect(formatActivityDisplayName({ activity_name: 'barrys' })).toBe("Barry's")
    expect(formatActivityDisplayName({ activity_name: "Barry's Bootcamp · Roma Norte" })).toBe("Barry's Bootcamp · Roma Norte")
  })
})
