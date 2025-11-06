/**
 * Problem Tutor Integration Tests
 * 
 * Tests that verify the rules engine correctly detects all problem tutor scenarios.
 * 
 * Task 3.23: Test with mock "problem tutors" - Should catch all issues
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
import { db, sessions } from "../../../src/lib/db";
import { eq } from "drizzle-orm";

describe("Problem Tutor Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("Chronic No-Show Tutor (tutor_10000)", () => {
    it("should detect chronic no-show tutor", async () => {
      const tutorId = SCENARIO_IDS.CHRONIC_NO_SHOW;
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      // Get tutor stats
      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      // Verify no-show rate is approximately 16%
      expect(stats.noShowRate).toBeGreaterThan(0.1); // At least 10%
      expect(stats.noShowRate).toBeLessThan(0.25); // Less than 25%
      expect(stats.noShowCount).toBeGreaterThan(0);

      // Test individual no-show sessions
      const tutorSessions = await getTutorSessions(tutorId);
      const noShowSessions = tutorSessions.filter(
        (s) => s.tutorJoinTime === null
      );

      expect(noShowSessions.length).toBeGreaterThan(0);

      // Test that no-show detection triggers flags
      for (const session of noShowSessions.slice(0, 5)) {
        const context: RuleContext = {
          session,
          config: DEFAULT_RULES_ENGINE_CONFIG,
        };
        const result = detectNoShow(context);
        expect(result.triggered).toBe(true);
        expect(result.flagType).toBe("no_show");
        expect(result.severity).toBe("critical");
      }

      // Verify overall score is low (< 50)
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeLessThan(50);
      expect(scores.breakdown.attendance).toBeLessThan(70); // Attendance should be penalized
    });
  });

  describe("Always Late Tutor (tutor_10001)", () => {
    it("should detect chronic lateness", async () => {
      const tutorId = SCENARIO_IDS.ALWAYS_LATE;
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

      // Verify lateness metrics
      expect(stats.avgLatenessMinutes).toBeGreaterThan(5); // Average > 5 minutes
      expect(stats.lateRate).toBeGreaterThan(0.3); // > 30% late (chronic threshold)
      expect(stats.lateCount).toBeGreaterThan(0);

      // Test chronic lateness detection
      const context: RuleContext = {
        tutorStats: stats,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };
      const result = detectChronicLateness(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("chronic_lateness");
      expect(result.severity).toBeGreaterThanOrEqual("medium"); // Should be medium or higher

      // Test individual late sessions
      const tutorSessions = await getTutorSessions(tutorId);
      const lateSessions = tutorSessions.filter((s) => {
        if (!s.tutorJoinTime || !s.sessionStartTime) return false;
        const lateness =
          (s.tutorJoinTime.getTime() - s.sessionStartTime.getTime()) / 60000;
        return lateness > DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes;
      });

      expect(lateSessions.length).toBeGreaterThan(0);

      // Verify overall score is low
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeLessThan(50);
      expect(scores.breakdown.attendance).toBeLessThan(70);
    });
  });

  describe("Poor First Sessions Tutor (tutor_10002)", () => {
    it("should detect poor first sessions", async () => {
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

      // Verify first session rating is low
      expect(stats.avgFirstSessionRating).toBeLessThan(3.0);
      expect(stats.firstSessions).toBeGreaterThan(0);

      // Test poor first session detection
      const tutorSessions = await getTutorSessions(tutorId);
      const firstSessions = tutorSessions.filter((s) => s.isFirstSession);

      expect(firstSessions.length).toBeGreaterThan(0);

      let flaggedCount = 0;
      for (const session of firstSessions) {
        if (
          session.studentFeedbackRating !== null &&
          session.studentFeedbackRating <=
            DEFAULT_RULES_ENGINE_CONFIG.poorFirstSessionRatingThreshold
        ) {
          const context: RuleContext = {
            session,
            config: DEFAULT_RULES_ENGINE_CONFIG,
          };
          const result = detectPoorFirstSession(context);

          if (result.triggered) {
            flaggedCount++;
            expect(result.flagType).toBe("poor_first_session");
            expect(result.severity).toBeGreaterThanOrEqual("high");
          }
        }
      }

      // Should flag at least some poor first sessions
      expect(flaggedCount).toBeGreaterThan(0);

      // Verify overall score is low
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeLessThan(50);
      expect(scores.breakdown.ratings).toBeLessThan(70);
    });
  });

  describe("Frequent Rescheduler Tutor (tutor_10003)", () => {
    it("should detect high reschedule rate", async () => {
      const tutorId = SCENARIO_IDS.FREQUENT_RESCHEDULER;
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

      // Verify reschedule rate is high (> 15% threshold)
      expect(stats.rescheduleRate).toBeGreaterThan(0.15);
      expect(stats.rescheduleCount).toBeGreaterThan(0);

      // Test high reschedule rate detection
      const context: RuleContext = {
        tutorStats: stats,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };
      const result = detectHighRescheduleRate(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("high_reschedule_rate");
      expect(result.severity).toBeGreaterThanOrEqual("medium");

      // Verify overall score is low
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeLessThan(50);
      expect(scores.breakdown.reliability).toBeLessThan(70);
    });
  });

  describe("Ends Early Tutor (tutor_10004)", () => {
    it("should detect early-end sessions", async () => {
      const tutorId = SCENARIO_IDS.ENDS_EARLY;
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

      // Verify early-end metrics
      expect(stats.avgEarlyEndMinutes).toBeGreaterThan(10);
      expect(stats.earlyEndCount).toBeGreaterThan(0);

      // Test early-end detection on individual sessions
      const tutorSessions = await getTutorSessions(tutorId);
      const earlyEndSessions = tutorSessions.filter((s) => {
        if (!s.tutorLeaveTime || !s.sessionEndTime) return false;
        const earlyMinutes =
          (s.sessionEndTime.getTime() - s.tutorLeaveTime.getTime()) / 60000;
        return earlyMinutes >= DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes;
      });

      expect(earlyEndSessions.length).toBeGreaterThan(0);

      // Test that early-end detection triggers flags
      for (const session of earlyEndSessions.slice(0, 5)) {
        const context: RuleContext = {
          session,
          config: DEFAULT_RULES_ENGINE_CONFIG,
        };
        const result = detectEarlyEnd(context);

        expect(result.triggered).toBe(true);
        expect(result.flagType).toBe("early_end");
      }

      // Verify overall score is low
      const scores = calculateAllScores(stats);
      expect(scores.overallScore).toBeLessThan(50);
      expect(scores.breakdown.completion).toBeLessThan(70);
    });
  });
});

