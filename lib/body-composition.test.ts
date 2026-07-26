import { describe, expect, it } from "vitest";
import { calculateFatMassKg } from "./body-composition";

describe("calculateFatMassKg", () => {
  it("derives fat mass from weight and body-fat percentage", () => {
    expect(calculateFatMassKg(72.65, 13.3)).toBeCloseTo(9.66245, 5);
  });

  it.each([
    [null, 13.3],
    [72.65, null],
    [0, 13.3],
    [72.65, -1],
    [72.65, 101],
  ])("returns null for incomplete or invalid inputs", (weight, bodyFat) => {
    expect(calculateFatMassKg(weight, bodyFat)).toBeNull();
  });
});
