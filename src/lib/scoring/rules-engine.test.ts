/**
 * Rules Engine Tests
 * 
 * Unit tests for rules engine functions.
 */

import { describe, it, expect } from "vitest";
import {
  detectNoShow,
  detectLateness,
  detectEarlyEnd,
  detectPoorFirstSession,
  createRuleResult,
  createNoTriggerResult,
  DEFAULT_RULES_ENGINE_CONFIG,
  type RuleContext,
} from "../scoring/rules-engine";
import type { Session } from "../types/session";

describe("Rules Engine", () => {
  const baseConfig = DEFAULT_RULES_ENGINE_CONFIG;

  describe("detectNoShow", () => {
    it("should detect no-show when tutor_join_time is null", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: null, // No-show
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
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
        config: baseConfig,
      };

      const result = detectNoShow(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("no_show");
      expect(result.severity).toBe("critical");
      expect(result.title).toContain("no-show");
    });

    it("should not trigger when tutor joined", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"), // Joined
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
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
        config: baseConfig,
      };

      const result = detectNoShow(context);

      expect(result.triggered).toBe(false);
    });

    it("should not trigger when session is missing", () => {
      const context: RuleContext = {
        config: baseConfig,
      };

      const result = detectNoShow(context);

      expect(result.triggered).toBe(false);
    });
  });

  describe("detectLateness", () => {
    it("should detect lateness when tutor joins more than threshold minutes late", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:06:00Z"), // 6 minutes late
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
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
        config: baseConfig,
      };

      const result = detectLateness(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("chronic_lateness");
      expect(result.severity).toBe("low"); // 6 minutes = low severity
    });

    it("should not trigger when tutor joins on time", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"), // On time
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
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
        config: baseConfig,
      };

      const result = detectLateness(context);

      expect(result.triggered).toBe(false);
    });
  });

  describe("detectEarlyEnd", () => {
    it("should detect early end when tutor leaves more than threshold minutes early", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"),
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
        tutorLeaveTime: new Date("2024-01-01T10:50:00Z"), // 10 minutes early
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
        config: baseConfig,
      };

      const result = detectEarlyEnd(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("early_end");
    });

    it("should not trigger when session ends on time", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"),
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
        tutorLeaveTime: new Date("2024-01-01T11:00:00Z"), // On time
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
        config: baseConfig,
      };

      const result = detectEarlyEnd(context);

      expect(result.triggered).toBe(false);
    });
  });

  describe("detectPoorFirstSession", () => {
    it("should detect poor first session when rating is at or below threshold", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"),
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
        tutorLeaveTime: new Date("2024-01-01T11:00:00Z"),
        studentLeaveTime: null,
        subjectsCovered: [],
        isFirstSession: true, // First session
        sessionType: null,
        sessionLengthScheduled: null,
        sessionLengthActual: null,
        wasRescheduled: false,
        rescheduledBy: null,
        rescheduleCount: 0,
        tutorFeedbackRating: null,
        tutorFeedbackDescription: null,
        studentFeedbackRating: 2, // Poor rating (at threshold)
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
        config: baseConfig,
      };

      const result = detectPoorFirstSession(context);

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("poor_first_session");
      expect(result.severity).toBe("high"); // 2 stars = high severity
    });

    it("should not trigger for non-first sessions", () => {
      const session: Session = {
        id: "1",
        sessionId: "session-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        sessionStartTime: new Date("2024-01-01T10:00:00Z"),
        sessionEndTime: new Date("2024-01-01T11:00:00Z"),
        tutorJoinTime: new Date("2024-01-01T10:00:00Z"),
        studentJoinTime: new Date("2024-01-01T10:00:00Z"),
        tutorLeaveTime: new Date("2024-01-01T11:00:00Z"),
        studentLeaveTime: null,
        subjectsCovered: [],
        isFirstSession: false, // Not first session
        sessionType: null,
        sessionLengthScheduled: null,
        sessionLengthActual: null,
        wasRescheduled: false,
        rescheduledBy: null,
        rescheduleCount: 0,
        tutorFeedbackRating: null,
        tutorFeedbackDescription: null,
        studentFeedbackRating: 2, // Poor rating but not first session
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
        config: baseConfig,
      };

      const result = detectPoorFirstSession(context);

      expect(result.triggered).toBe(false);
    });
  });

  describe("helper functions", () => {
    it("createRuleResult should create triggered result", () => {
      const result = createRuleResult(
        "no_show",
        "critical",
        "Test Title",
        "Test Description",
        {
          recommendedAction: "Test Action",
          confidence: 0.9,
        }
      );

      expect(result.triggered).toBe(true);
      expect(result.flagType).toBe("no_show");
      expect(result.severity).toBe("critical");
      expect(result.title).toBe("Test Title");
      expect(result.description).toBe("Test Description");
      expect(result.recommendedAction).toBe("Test Action");
      expect(result.confidence).toBe(0.9);
    });

    it("createNoTriggerResult should create non-triggered result", () => {
      const result = createNoTriggerResult("no_show");

      expect(result.triggered).toBe(false);
      expect(result.flagType).toBe("no_show");
    });
  });
});

