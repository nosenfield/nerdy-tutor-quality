/**
 * Score Validation Integration Tests
 * 
 * Tests that verify scores meet completion criteria:
 * - Problem tutors get scores < 50
 * - Excellent tutors get scores > 80
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTutorStats, DEFAULT_RULES_ENGINE_CONFIG } from "../../../src/lib/scoring/rules-engine";
import { calculateAllScores } from "../../../src/lib/scoring/aggregator";
import { SCENARIO_IDS } from "../../../src/lib/mock-data/scenarios";
import { setupTestDatabase, teardownTestDatabase } from "../utils/test-db";

describe("Score Validation Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("Problem Tutors Score Validation", () => {
    it("should give problem tutors scores < 50", async () => {
      const problemTutors = [
        SCENARIO_IDS.CHRONIC_NO_SHOW,
        SCENARIO_IDS.ALWAYS_LATE,
        SCENARIO_IDS.FREQUENT_RESCHEDULER,
        SCENARIO_IDS.ENDS_EARLY,
      ];

      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      for (const tutorId of problemTutors) {
        const stats = await getTutorStats(
          tutorId,
          windowStart,
          windowEnd,
          DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
          DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
        );

        // Need at least minimum sessions for aggregate rules
        if (stats.totalSessions >= DEFAULT_RULES_ENGINE_CONFIG.minSessionsForAggregateRules) {
          const scores = calculateAllScores(stats);

          expect(
            scores.overallScore,
            `Tutor ${tutorId} should have score < 50, got ${scores.overallScore}`
          ).toBeLessThan(50);
        }
      }
    });

    it("should give poor first sessions tutor score < 50", async () => {
      const tutorId = SCENARIO_IDS.POOR_FIRST_SESSIONS;
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      if (stats.totalSessions >= DEFAULT_RULES_ENGINE_CONFIG.minSessionsForAggregateRules) {
        const scores = calculateAllScores(stats);

        // Poor first sessions should lower ratings score
        expect(scores.overallScore).toBeLessThan(50);
        expect(scores.breakdown.ratings).toBeLessThan(70);
      }
    });
  });

  describe("Excellent Tutor Score Validation", () => {
    it("should give excellent tutor score > 80", async () => {
      const tutorId = SCENARIO_IDS.EXCELLENT;
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      // Need enough sessions for reliable score
      if (stats.totalSessions >= DEFAULT_RULES_ENGINE_CONFIG.minSessionsForAggregateRules) {
        const scores = calculateAllScores(stats);

        expect(
          scores.overallScore,
          `Excellent tutor should have score > 80, got ${scores.overallScore}`
        ).toBeGreaterThan(80);

        // All component scores should be good
        expect(scores.breakdown.attendance).toBeGreaterThan(70);
        expect(scores.breakdown.completion).toBeGreaterThan(70);
        expect(scores.breakdown.reliability).toBeGreaterThan(70);
        if (stats.avgStudentRating !== null) {
          expect(scores.breakdown.ratings).toBeGreaterThan(70);
        }
      }
    });
  });

  describe("Score Breakdown Validation", () => {
    it("should calculate valid score breakdowns", async () => {
      const tutorId = SCENARIO_IDS.EXCELLENT;
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      const scores = calculateAllScores(stats);

      // All scores should be between 0 and 100
      expect(scores.overallScore).toBeGreaterThanOrEqual(0);
      expect(scores.overallScore).toBeLessThanOrEqual(100);

      expect(scores.breakdown.attendance).toBeGreaterThanOrEqual(0);
      expect(scores.breakdown.attendance).toBeLessThanOrEqual(100);

      expect(scores.breakdown.ratings).toBeGreaterThanOrEqual(0);
      expect(scores.breakdown.ratings).toBeLessThanOrEqual(100);

      expect(scores.breakdown.completion).toBeGreaterThanOrEqual(0);
      expect(scores.breakdown.completion).toBeLessThanOrEqual(100);

      expect(scores.breakdown.reliability).toBeGreaterThanOrEqual(0);
      expect(scores.breakdown.reliability).toBeLessThanOrEqual(100);

      // Confidence should be between 0 and 1
      expect(scores.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(scores.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});

