/**
 * Aggregator Tests
 * 
 * Unit tests for scoring aggregator functions.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAttendanceScore,
  calculateRatingsScore,
  calculateCompletionScore,
  calculateReliabilityScore,
  calculateOverallScore,
  calculateConfidenceScore,
  calculateAllScores,
  DEFAULT_SCORE_WEIGHTS,
  type ScoreWeights,
} from "./aggregator";
import type { TutorStats } from "./rules-engine";

describe("Scoring Aggregator", () => {
  const createMockTutorStats = (overrides: Partial<TutorStats> = {}): TutorStats => {
    return {
      tutorId: "tutor-1",
      windowStart: new Date("2024-01-01"),
      windowEnd: new Date("2024-01-31"),
      totalSessions: 30,
      firstSessions: 5,
      noShowCount: 0,
      noShowRate: 0,
      lateCount: 0,
      lateRate: 0,
      avgLatenessMinutes: null,
      earlyEndCount: 0,
      earlyEndRate: 0,
      avgEarlyEndMinutes: null,
      rescheduleCount: 0,
      rescheduleRate: 0,
      tutorInitiatedReschedules: 0,
      avgStudentRating: 4.5,
      avgFirstSessionRating: 4.0,
      ratingTrend: "stable",
      recentSessions: [],
      ...overrides,
    };
  };

  describe("calculateAttendanceScore", () => {
    it("should return 100 for perfect attendance", () => {
      const stats = createMockTutorStats({
        noShowRate: 0,
        lateRate: 0,
      });

      const score = calculateAttendanceScore(stats);

      expect(score).toBe(100);
    });

    it("should penalize no-shows heavily", () => {
      const stats = createMockTutorStats({
        noShowRate: 0.1, // 10% no-show rate
        lateRate: 0,
      });

      const score = calculateAttendanceScore(stats);

      expect(score).toBe(80); // 100 - (0.1 * 20) = 80
    });

    it("should penalize lateness", () => {
      const stats = createMockTutorStats({
        noShowRate: 0,
        lateRate: 0.2, // 20% late rate
      });

      const score = calculateAttendanceScore(stats);

      expect(score).toBe(90); // 100 - (0.2 * 5) = 90
    });

    it("should combine no-show and lateness penalties", () => {
      const stats = createMockTutorStats({
        noShowRate: 0.05, // 5% no-show
        lateRate: 0.1, // 10% late
      });

      const score = calculateAttendanceScore(stats);

      expect(score).toBe(85); // 100 - (0.05 * 20) - (0.1 * 5) = 85
    });

    it("should not go below 0", () => {
      const stats = createMockTutorStats({
        noShowRate: 1.0, // 100% no-show
        lateRate: 1.0, // 100% late
      });

      const score = calculateAttendanceScore(stats);

      expect(score).toBe(0);
    });
  });

  describe("calculateRatingsScore", () => {
    it("should return 100 for perfect rating (5.0)", () => {
      const stats = createMockTutorStats({
        avgStudentRating: 5.0,
      });

      const score = calculateRatingsScore(stats);

      expect(score).toBe(100);
    });

    it("should return 75 for 4.0 rating", () => {
      const stats = createMockTutorStats({
        avgStudentRating: 4.0,
      });

      const score = calculateRatingsScore(stats);

      expect(score).toBe(75);
    });

    it("should return 50 for 3.0 rating", () => {
      const stats = createMockTutorStats({
        avgStudentRating: 3.0,
      });

      const score = calculateRatingsScore(stats);

      expect(score).toBe(50);
    });

    it("should return 0 for 1.0 rating", () => {
      const stats = createMockTutorStats({
        avgStudentRating: 1.0,
      });

      const score = calculateRatingsScore(stats);

      expect(score).toBe(0);
    });

    it("should return 50 when no ratings available", () => {
      const stats = createMockTutorStats({
        avgStudentRating: null,
      });

      const score = calculateRatingsScore(stats);

      expect(score).toBe(50);
    });
  });

  describe("calculateCompletionScore", () => {
    it("should return 100 for perfect completion", () => {
      const stats = createMockTutorStats({
        earlyEndRate: 0,
      });

      const score = calculateCompletionScore(stats);

      expect(score).toBe(100);
    });

    it("should penalize early-end sessions", () => {
      const stats = createMockTutorStats({
        earlyEndRate: 0.1, // 10% early-end rate
      });

      const score = calculateCompletionScore(stats);

      expect(score).toBe(90); // 100 - (0.1 * 10) = 90
    });

    it("should not go below 0", () => {
      const stats = createMockTutorStats({
        earlyEndRate: 1.5, // 150% (impossible but tests bounds)
      });

      const score = calculateCompletionScore(stats);

      expect(score).toBe(0);
    });
  });

  describe("calculateReliabilityScore", () => {
    it("should return 100 for perfect reliability", () => {
      const stats = createMockTutorStats({
        rescheduleRate: 0,
      });

      const score = calculateReliabilityScore(stats);

      expect(score).toBe(100);
    });

    it("should penalize reschedules", () => {
      const stats = createMockTutorStats({
        rescheduleRate: 0.2, // 20% reschedule rate
      });

      const score = calculateReliabilityScore(stats);

      expect(score).toBe(90); // 100 - (0.2 * 5) = 90
    });
  });

  describe("calculateOverallScore", () => {
    it("should calculate weighted average correctly", () => {
      const breakdown = {
        attendance: 80,
        ratings: 90,
        completion: 70,
        reliability: 85,
      };

      const weights: ScoreWeights = {
        attendance: 0.25,
        ratings: 0.25,
        completion: 0.25,
        reliability: 0.25,
      };

      const score = calculateOverallScore(breakdown, weights);

      // (80 * 0.25) + (90 * 0.25) + (70 * 0.25) + (85 * 0.25) = 81.25
      expect(score).toBe(81);
    });

    it("should use default weights when not provided", () => {
      const breakdown = {
        attendance: 100,
        ratings: 100,
        completion: 100,
        reliability: 100,
      };

      const score = calculateOverallScore(breakdown);

      expect(score).toBe(100);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("should return 0 for 0 sessions", () => {
      const confidence = calculateConfidenceScore(0);

      expect(confidence).toBe(0);
    });

    it("should return 0.5 for 15 sessions", () => {
      const confidence = calculateConfidenceScore(15);

      expect(confidence).toBe(0.5);
    });

    it("should return 1.0 for 30+ sessions", () => {
      const confidence = calculateConfidenceScore(30);

      expect(confidence).toBe(1.0);

      const confidenceMore = calculateConfidenceScore(100);

      expect(confidenceMore).toBe(1.0);
    });

    it("should scale linearly up to 30 sessions", () => {
      const confidence10 = calculateConfidenceScore(10);
      const confidence20 = calculateConfidenceScore(20);

      expect(confidence10).toBeCloseTo(0.333, 2);
      expect(confidence20).toBeCloseTo(0.667, 2);
    });
  });

  describe("calculateAllScores", () => {
    it("should calculate all scores correctly", () => {
      const stats = createMockTutorStats({
        noShowRate: 0.05,
        lateRate: 0.1,
        earlyEndRate: 0.05,
        rescheduleRate: 0.1,
        avgStudentRating: 4.5,
        totalSessions: 20,
      });

      const result = calculateAllScores(stats);

      expect(result.breakdown.attendance).toBeGreaterThan(0);
      expect(result.breakdown.ratings).toBeGreaterThan(0);
      expect(result.breakdown.completion).toBeGreaterThan(0);
      expect(result.breakdown.reliability).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
    });

    it("should handle perfect tutor", () => {
      const stats = createMockTutorStats({
        noShowRate: 0,
        lateRate: 0,
        earlyEndRate: 0,
        rescheduleRate: 0,
        avgStudentRating: 5.0,
        totalSessions: 30,
      });

      const result = calculateAllScores(stats);

      expect(result.breakdown.attendance).toBe(100);
      expect(result.breakdown.ratings).toBe(100);
      expect(result.breakdown.completion).toBe(100);
      expect(result.breakdown.reliability).toBe(100);
      expect(result.overallScore).toBe(100);
      expect(result.confidenceScore).toBe(1.0);
    });
  });
});

