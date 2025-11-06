/**
 * Edge Cases Integration Tests
 * 
 * Tests for edge cases and boundary conditions in the rules engine.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  detectHighRescheduleRate,
  detectChronicLateness,
  detectDecliningRatingTrend,
  getTutorStats,
  DEFAULT_RULES_ENGINE_CONFIG,
  type RuleContext,
} from "../../../src/lib/scoring/rules-engine";
import { calculateConfidenceScore, calculateAllScores } from "../../../src/lib/scoring/aggregator";
import { setupTestDatabase, teardownTestDatabase } from "../utils/test-db";
import { db, sessions } from "../../../src/lib/db";
import { eq } from "drizzle-orm";
import { generateMockSession, generateMockTutor, generateMockStudent } from "../../../src/lib/mock-data/generators";
import { faker } from "@faker-js/faker";
import type { FlagSeverity } from "../../../src/lib/types/flag";

/**
 * Helper function to convert severity to numeric value for comparisons
 */
function severityToNumber(severity: FlagSeverity): number {
  const severityMap: Record<FlagSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return severityMap[severity];
}

describe("Edge Cases Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("New Tutors (Few Sessions)", () => {
    it("should handle new tutors with few sessions", async () => {
      const tutor = generateMockTutor("average", 9999);
      const tutorId = tutor.tutorId;
      const student = generateMockStudent(9999);
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      // Create a tutor with only 3 sessions
      const mockSessions = [];
      for (let i = 0; i < 3; i++) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - (10 - i * 3));
        const session = generateMockSession(tutor, student, {
          scheduledStartTime: sessionStart,
        });
        mockSessions.push(session);
      }

      // Insert sessions
      await db.insert(sessions).values(mockSessions);

      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      expect(stats.totalSessions).toBe(3);

      // Aggregate rules should not trigger (minSessionsForAggregateRules = 5)
      const context: RuleContext = {
        tutorStats: stats,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };

      const rescheduleResult = detectHighRescheduleRate(context);
      expect(rescheduleResult.triggered).toBe(false);

      const latenessResult = detectChronicLateness(context);
      expect(latenessResult.triggered).toBe(false);

      // Confidence should be low
      const scores = calculateAllScores(stats);
      expect(scores.confidenceScore).toBeLessThan(0.2); // 3/30 = 0.1

      // Cleanup
      await db.delete(sessions).where(eq(sessions.tutorId, tutorId));
    });

    it("should calculate confidence score correctly for various session counts", () => {
      expect(calculateConfidenceScore(0)).toBe(0);
      expect(calculateConfidenceScore(10)).toBeCloseTo(0.333, 2);
      expect(calculateConfidenceScore(15)).toBe(0.5);
      expect(calculateConfidenceScore(30)).toBe(1.0);
      expect(calculateConfidenceScore(100)).toBe(1.0);
    });
  });

  describe("Timezone Handling", () => {
    it("should handle timezone differences correctly in lateness detection", () => {
      const { detectLateness } = require("../../../src/lib/scoring/rules-engine");
      const { DEFAULT_RULES_ENGINE_CONFIG } = require("../../../src/lib/scoring/rules-engine");

      // Create session with UTC times
      const sessionStartTime = new Date("2024-01-01T10:00:00Z");
      const tutorJoinTime = new Date("2024-01-01T10:06:00Z"); // 6 minutes late in UTC

      const session = {
        id: "test-1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime,
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime,
        studentJoinTime: sessionStartTime,
        tutorLeaveTime: null,
        studentLeaveTime: null,
        subjectsCovered: [],
        isFirstSession: false,
        sessionType: null,
        sessionLengthScheduled: null,
        sessionLengthActual: null,
        wasRescheduled: false,
        rescheduledBy: null,
        rescheduleCount: 0,
        tutorFeedbackRating: null,
        tutorFeedbackDescription: null,
        studentFeedbackRating: null,
        studentFeedbackDescription: null,
        videoUrl: null,
        transcriptUrl: null,
        aiSummary: null,
        studentBookedFollowup: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const context: RuleContext = {
        session,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };

      const result = detectLateness(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("chronic_lateness");
      if (result.supportingData?.metrics) {
        expect(result.supportingData.metrics.latenessMinutes).toBe(6);
      }
    });
  });

  describe("Missing Data Handling", () => {
    it("should handle null ratings gracefully", async () => {
      const tutor = generateMockTutor("average", 9998);
      const tutorId = tutor.tutorId;
      const student = generateMockStudent(9998);
      const studentId = student.studentId;
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 30);

      // Create sessions without ratings
      const mockSessions = [];
      for (let i = 0; i < 10; i++) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - (10 - i));
        const session = generateMockSession(tutor, student, {
          scheduledStartTime: sessionStart,
        });
        // Remove ratings
        session.studentFeedbackRating = null;
        session.tutorFeedbackRating = null;
        mockSessions.push(session);
      }

      await db.insert(sessions).values(mockSessions);

      const stats = await getTutorStats(
        tutorId,
        windowStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      // Should handle null ratings
      expect(stats.avgStudentRating).toBeNull();

      const scores = calculateAllScores(stats);
      // Ratings score should default to 50 when no ratings
      expect(scores.breakdown.ratings).toBe(50);

      // Cleanup
      await db.delete(sessions).where(eq(sessions.tutorId, tutorId));
    });

    it("should handle tutors with no sessions", async () => {
      const tutorId = "tutor_no_sessions";
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

      expect(stats.totalSessions).toBe(0);
      expect(stats.noShowRate).toBeNull();
      expect(stats.lateRate).toBeNull();
      expect(stats.avgStudentRating).toBeNull();

      // Should not trigger aggregate rules
      const context: RuleContext = {
        tutorStats: stats,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };

      const rescheduleResult = detectHighRescheduleRate(context);
      expect(rescheduleResult.triggered).toBe(false);
    });
  });

  describe("Declining Rating Trend", () => {
    it("should detect declining rating trend when present", async () => {
      const tutor = generateMockTutor("average", 9997);
      const tutorId = tutor.tutorId;
      const student = generateMockStudent(9997);
      const windowEnd = new Date();
      const window90dStart = new Date();
      window90dStart.setDate(window90dStart.getDate() - 90);

      const mockSessions = [];

      // Old sessions (60-90 days ago) - high ratings
      for (let i = 0; i < 10; i++) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - (80 - i * 2));
        const session = generateMockSession(tutor, student, {
          scheduledStartTime: sessionStart,
        });
        session.studentFeedbackRating = 4.5; // High rating
        mockSessions.push(session);
      }

      // Middle sessions (30-60 days ago) - medium ratings
      for (let i = 0; i < 10; i++) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - (50 - i * 2));
        const session = generateMockSession(tutor, student, {
          scheduledStartTime: sessionStart,
        });
        session.studentFeedbackRating = 4.0; // Medium rating
        mockSessions.push(session);
      }

      // Recent sessions (0-30 days ago) - low ratings
      for (let i = 0; i < 10; i++) {
        const sessionStart = new Date();
        sessionStart.setDate(sessionStart.getDate() - (20 - i * 2));
        const session = generateMockSession(tutor, student, {
          scheduledStartTime: sessionStart,
        });
        session.studentFeedbackRating = 3.5; // Low rating
        mockSessions.push(session);
      }

      await db.insert(sessions).values(mockSessions);

      // Get 30-day stats
      const window30dStart = new Date();
      window30dStart.setDate(window30dStart.getDate() - 30);
      const stats30d = await getTutorStats(
        tutorId,
        window30dStart,
        windowEnd,
        DEFAULT_RULES_ENGINE_CONFIG.latenessThresholdMinutes,
        DEFAULT_RULES_ENGINE_CONFIG.earlyEndThresholdMinutes
      );

      // Test declining trend detection
      const context: RuleContext = {
        tutorStats: stats30d,
        config: DEFAULT_RULES_ENGINE_CONFIG,
      };

      const result = await detectDecliningRatingTrend(context, tutorId);

      // Should detect declining trend
      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("low_ratings");
      expect(severityToNumber(result.severity)).toBeGreaterThanOrEqual(severityToNumber("low"));

      // Cleanup
      await db.delete(sessions).where(eq(sessions.tutorId, tutorId));
    });
  });
});

