export function calculateFatMassKg(
  weightKg: number | null | undefined,
  bodyFatPercentage: number | null | undefined,
) {
  if (
    typeof weightKg !== "number" ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    typeof bodyFatPercentage !== "number" ||
    !Number.isFinite(bodyFatPercentage) ||
    bodyFatPercentage < 0 ||
    bodyFatPercentage > 100
  ) {
    return null;
  }

  return weightKg * (bodyFatPercentage / 100);
}
