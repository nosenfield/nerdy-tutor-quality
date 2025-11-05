import { describe, it, expect } from "vitest";
import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  calculateSessionDuration,
  calculateLateness,
  isNoShow,
  isLate,
  endedEarly,
  getTimeWindow,
} from "@/lib/utils/time";

describe("Time Utilities", () => {
  describe("differenceInMinutes", () => {
    it("should calculate difference in minutes between two dates", () => {
      const date1 = new Date("2025-11-05T10:00:00Z");
      const date2 = new Date("2025-11-05T10:15:00Z");

      expect(differenceInMinutes(date1, date2)).toBe(15);
    });

    it("should handle ISO string dates", () => {
      expect(
        differenceInMinutes("2025-11-05T10:00:00Z", "2025-11-05T10:30:00Z")
      ).toBe(30);
    });

    it("should return negative for reversed dates", () => {
      const date1 = new Date("2025-11-05T10:00:00Z");
      const date2 = new Date("2025-11-05T09:45:00Z");

      expect(differenceInMinutes(date1, date2)).toBe(-15);
    });
  });

  describe("differenceInHours", () => {
    it("should calculate difference in hours", () => {
      const date1 = new Date("2025-11-05T10:00:00Z");
      const date2 = new Date("2025-11-05T13:00:00Z");

      expect(differenceInHours(date1, date2)).toBe(3);
    });
  });

  describe("differenceInDays", () => {
    it("should calculate difference in days", () => {
      const date1 = new Date("2025-11-05T10:00:00Z");
      const date2 = new Date("2025-11-08T10:00:00Z");

      expect(differenceInDays(date1, date2)).toBe(3);
    });
  });

  describe("calculateSessionDuration", () => {
    it("should calculate session duration in minutes", () => {
      const start = new Date("2025-11-05T10:00:00Z");
      const end = new Date("2025-11-05T10:45:00Z");

      expect(calculateSessionDuration(start, end)).toBe(45);
    });

    it("should return null if start time is missing", () => {
      const end = new Date("2025-11-05T10:45:00Z");

      expect(calculateSessionDuration(null, end)).toBeNull();
    });

    it("should return null if end time is missing", () => {
      const start = new Date("2025-11-05T10:00:00Z");

      expect(calculateSessionDuration(start, null)).toBeNull();
    });
  });

  describe("calculateLateness", () => {
    it("should calculate lateness in minutes", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");
      const actual = new Date("2025-11-05T10:10:00Z");

      expect(calculateLateness(scheduled, actual)).toBe(10);
    });

    it("should return null for no-show", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");

      expect(calculateLateness(scheduled, null)).toBeNull();
    });

    it("should return 0 if on-time or early", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");
      const actual = new Date("2025-11-05T09:55:00Z");

      expect(calculateLateness(scheduled, actual)).toBe(0);
    });
  });

  describe("isNoShow", () => {
    it("should return true for null join time", () => {
      expect(isNoShow(null)).toBe(true);
      expect(isNoShow(undefined)).toBe(true);
    });

    it("should return false for valid join time", () => {
      const joinTime = new Date("2025-11-05T10:00:00Z");
      expect(isNoShow(joinTime)).toBe(false);
    });
  });

  describe("isLate", () => {
    it("should return true if lateness exceeds threshold", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");
      const actual = new Date("2025-11-05T10:10:00Z");

      expect(isLate(scheduled, actual, 5)).toBe(true);
    });

    it("should return false if within threshold", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");
      const actual = new Date("2025-11-05T10:03:00Z");

      expect(isLate(scheduled, actual, 5)).toBe(false);
    });

    it("should return false for no-show", () => {
      const scheduled = new Date("2025-11-05T10:00:00Z");

      expect(isLate(scheduled, null, 5)).toBe(false);
    });
  });

  describe("endedEarly", () => {
    it("should return true if ended early by more than threshold", () => {
      const scheduled = new Date("2025-11-05T11:00:00Z");
      const actual = new Date("2025-11-05T10:45:00Z");

      expect(endedEarly(scheduled, actual, 10)).toBe(true);
    });

    it("should return false if within threshold", () => {
      const scheduled = new Date("2025-11-05T11:00:00Z");
      const actual = new Date("2025-11-05T10:55:00Z");

      expect(endedEarly(scheduled, actual, 10)).toBe(false);
    });

    it("should return false if no end time", () => {
      const scheduled = new Date("2025-11-05T11:00:00Z");

      expect(endedEarly(scheduled, null, 10)).toBe(false);
    });
  });

  describe("getTimeWindow", () => {
    it("should return correct time window", () => {
      const { windowStart, windowEnd } = getTimeWindow(30);

      expect(windowEnd).toBeInstanceOf(Date);
      expect(windowStart).toBeInstanceOf(Date);
      expect(windowEnd.getTime()).toBeGreaterThan(windowStart.getTime());

      const daysDiff = Math.round(
        (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30);
    });
  });
});

