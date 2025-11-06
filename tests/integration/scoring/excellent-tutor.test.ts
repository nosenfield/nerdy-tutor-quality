/**
 * Excellent Tutor Integration Tests
 * 
 * Tests that verify excellent tutors don't get false positive flags.
 * 
 * Task 3.24: Test with mock "excellent tutors" - Should not flag
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  detectNoShow,
  detectLateness,
  detectEarlyEnd,
  detectPoorFirstSession,
  detectHighRescheduleRate,
  detectChronicLateness,
  getTutorStats,
  DEFAULT_RULES_ENGINE_CONFIG,
  type RuleContext,
} from "../../../src/lib/scoring/rules-engine";
import { calculateAllScores } from "../../../src/lib/scoring/aggregator";
import { SCENARIO_IDS } from "../../../src/lib/mock-data/scenarios";
import { setupTestDatabase, teardownTestDatabase, getTutorSessions } from "../utils/test-db";

describe("Excellent Tutor Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("Excellent Tutor (tutor_10005)", () => {
    it("should not flag excellent tutor", async () => {
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

      // Verify stats are good
      expect(stats.noShowRate).toBeLessThan(0.05); // < 5%
      expect(stats.lateRate).toBeLessThan(0.10); // < 10%
      if (stats.avgStudentRating !== null) {
        expect(stats.avgStudentRating).toBeGreaterThan(4.0);
      }
      expect(stats.rescheduleRate).toBeLessThan(0.10); // < 10%

      // Test aggregate rules - should not trigger
      const config = DEFAULT_RULES_ENGINE_CONFIG;
      const aggregateContext: RuleContext = {
        tutorStats: stats,
        config,
      };

      const rescheduleResult = detectHighRescheduleRate(aggregateContext);
      expect(rescheduleResult.triggered).toBe(false);

      const latenessResult = detectChronicLateness(aggregateContext);
      expect(latenessResult.triggered).toBe(false);

      // Test session-level rules on sample sessions
      const tutorSessions = await getTutorSessions(tutorId);
      expect(tutorSessions.length).toBeGreaterThan(0);

      // Sample up to 10 sessions to test
      const sampleSessions = tutorSessions.slice(0, 10);

      for (const session of sampleSessions) {
        const sessionContext: RuleContext = {
          session,
          config,
        };

        const noShowResult = detectNoShow(sessionContext);
        const latenessResult = detectLateness(sessionContext);
        const earlyEndResult = detectEarlyEnd(sessionContext);
        const poorFirstResult = detectPoorFirstSession(sessionContext);

        // Should not trigger flags for excellent tutor
        expect(noShowResult.triggered).toBe(false);
        expect(latenessResult.triggered).toBe(false);
        expect(earlyEndResult.triggered).toBe(false);

        // Poor first session might trigger if rating is low, but shouldn't for excellent tutor
        if (session.isFirstSession && session.studentFeedbackRating !== null) {
          // Excellent tutor should have good first session ratings
          if (session.studentFeedbackRating > 2) {
            expect(poorFirstResult.triggered).toBe(false);
          }
        }
      }

      // Verify score is high (> 80)
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeGreaterThan(80);
      expect(scores.breakdown.attendance).toBeGreaterThan(70);
      if (stats.avgStudentRating !== null) {
        expect(scores.breakdown.ratings).toBeGreaterThan(70);
      }
      expect(scores.breakdown.completion).toBeGreaterThan(70);
      expect(scores.breakdown.reliability).toBeGreaterThan(70);

      // Should have high confidence if enough sessions
      if (stats.totalSessions >= 30) {
        expect(scores.confidenceScore).toBeGreaterThan(0.8);
      }
    });

    it("should have high component scores", async () => {
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

      // All component scores should be good
      expect(scores.breakdown.attendance).toBeGreaterThan(70);
      expect(scores.breakdown.completion).toBeGreaterThan(70);
      expect(scores.breakdown.reliability).toBeGreaterThan(70);
      if (stats.avgStudentRating !== null) {
        expect(scores.breakdown.ratings).toBeGreaterThan(70);
      }
    });
  });
});

