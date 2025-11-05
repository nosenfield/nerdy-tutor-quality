import { describe, it, expect } from "vitest";
import {
  average,
  median,
  percentile,
  percentileRank,
  calculateRate,
  calculateTrend,
  standardDeviation,
  round,
} from "@/lib/utils/stats";

describe("Statistical Utilities", () => {
  describe("average", () => {
    it("should calculate average of numbers", () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
    });

    it("should return null for empty array", () => {
      expect(average([])).toBeNull();
    });

    it("should handle single value", () => {
      expect(average([42])).toBe(42);
    });

    it("should handle decimal values", () => {
      expect(average([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
    });
  });

  describe("median", () => {
    it("should calculate median for odd number of values", () => {
      expect(median([1, 3, 5, 7, 9])).toBe(5);
    });

    it("should calculate median for even number of values", () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it("should return null for empty array", () => {
      expect(median([])).toBeNull();
    });

    it("should handle unsorted array", () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
    });
  });

  describe("percentile", () => {
    it("should calculate 50th percentile (median)", () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentile(values, 50)).toBe(5.5);
    });

    it("should calculate 25th percentile", () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentile(values, 25)).toBeCloseTo(3.25);
    });

    it("should return first value for 0th percentile", () => {
      const values = [1, 2, 3, 4, 5];
      expect(percentile(values, 0)).toBe(1);
    });

    it("should return last value for 100th percentile", () => {
      const values = [1, 2, 3, 4, 5];
      expect(percentile(values, 100)).toBe(5);
    });

    it("should return null for empty array", () => {
      expect(percentile([], 50)).toBeNull();
    });
  });

  describe("percentileRank", () => {
    it("should calculate percentile rank correctly", () => {
      const distribution = [10, 20, 30, 40, 50];
      expect(percentileRank(30, distribution)).toBe(50);
    });

    it("should handle value at exact percentile", () => {
      const distribution = [1, 2, 3, 4, 5];
      expect(percentileRank(3, distribution)).toBe(50);
    });

    it("should return null for empty distribution", () => {
      expect(percentileRank(5, [])).toBeNull();
    });
  });

  describe("calculateRate", () => {
    it("should calculate rate as decimal", () => {
      expect(calculateRate(3, 10)).toBe(0.3);
    });

    it("should return null for zero total", () => {
      expect(calculateRate(5, 0)).toBeNull();
    });

    it("should handle 100% rate", () => {
      expect(calculateRate(10, 10)).toBe(1);
    });

    it("should handle 0% rate", () => {
      expect(calculateRate(0, 10)).toBe(0);
    });
  });

  describe("calculateTrend", () => {
    it("should detect improving trend", () => {
      expect(calculateTrend(50, 60, 0.05)).toBe("improving");
    });

    it("should detect declining trend", () => {
      expect(calculateTrend(60, 50, 0.05)).toBe("declining");
    });

    it("should detect stable trend", () => {
      expect(calculateTrend(50, 51, 0.05)).toBe("stable");
    });

    it("should return null for null values", () => {
      expect(calculateTrend(null, 50, 0.05)).toBeNull();
      expect(calculateTrend(50, null, 0.05)).toBeNull();
    });

    it("should respect threshold", () => {
      expect(calculateTrend(50, 53, 0.05)).toBe("improving"); // 6% change
      expect(calculateTrend(50, 52, 0.05)).toBe("stable"); // 4% change
    });
  });

  describe("standardDeviation", () => {
    it("should calculate standard deviation", () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = standardDeviation(values);
      expect(result).toBeCloseTo(2, 1);
    });

    it("should return null for empty array", () => {
      expect(standardDeviation([])).toBeNull();
    });

    it("should return 0 for single value", () => {
      expect(standardDeviation([5])).toBe(0);
    });
  });

  describe("round", () => {
    it("should round to 2 decimal places by default", () => {
      expect(round(3.14159)).toBe(3.14);
    });

    it("should round to specified decimal places", () => {
      expect(round(3.14159, 3)).toBe(3.142);
    });

    it("should handle whole numbers", () => {
      expect(round(5)).toBe(5);
    });
  });
});

