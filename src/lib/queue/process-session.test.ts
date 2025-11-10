/**
 * Tests for Session Processing
 * 
 * Tests the session processing logic and flag creation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { processSession } from "./process-session";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

// Mock the database and rules engine
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
  sessions: {},
}));

vi.mock("@/lib/scoring/rules-engine", () => ({
  getTutorStats: vi.fn(),
  detectNoShow: vi.fn(),
  detectLateness: vi.fn(),
  detectEarlyEnd: vi.fn(),
  detectPoorFirstSession: vi.fn(),
  detectHighRescheduleRate: vi.fn(),
  detectChronicLateness: vi.fn(),
  detectDecliningRatingTrend: vi.fn(),
  DEFAULT_RULES_ENGINE_CONFIG: {
    latenessThresholdMinutes: 5,
    earlyEndThresholdMinutes: 10,
    poorFirstSessionRatingThreshold: 2,
    highRescheduleRateThreshold: 0.15,
    chronicLatenessRateThreshold: 0.30,
    aggregateWindowDays: 30,
    minSessionsForAggregateRules: 5,
  },
}));

vi.mock("./create-flags", () => ({
  createFlagsFromRuleResults: vi.fn(),
}));

describe("processSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a session and create flags", async () => {
    // Mock session data
    const mockSession = {
      sessionId: "session_123",
      tutorId: "tutor_456",
      isFirstSession: false,
      sessionStartTime: new Date(),
      tutorJoinTime: new Date(),
      sessionEndTime: new Date(),
      tutorLeaveTime: new Date(),
      studentFeedbackRating: 4,
      wasRescheduled: false,
      subjectsCovered: ["Math"],
    };

    // Mock database query
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      }),
    });

    vi.mocked(db.select).mockReturnValue(mockSelect as any);

    // Mock rules engine
    const { detectNoShow, detectLateness, detectEarlyEnd } = await import(
      "@/lib/scoring/rules-engine"
    );
    vi.mocked(detectNoShow).mockReturnValue({
      triggered: true,
      flagType: "no_show",
      severity: "critical",
      title: "Tutor No-Show",
      description: "Tutor did not join session",
    } as any);

    vi.mocked(detectLateness).mockReturnValue({
      triggered: false,
      flagType: "chronic_lateness",
      severity: "low",
      title: "",
      description: "",
    } as any);

    vi.mocked(detectEarlyEnd).mockReturnValue({
      triggered: false,
      flagType: "early_end",
      severity: "low",
      title: "",
      description: "",
    } as any);

    // Mock flag creation
    const { createFlagsFromRuleResults } = await import("./create-flags");
    vi.mocked(createFlagsFromRuleResults).mockResolvedValue(["flag_123"]);

    // Process session
    const flagIds = await processSession("session_123");

    // Verify flags were created
    expect(flagIds).toEqual(["flag_123"]);
    expect(createFlagsFromRuleResults).toHaveBeenCalled();
  });

  it("should throw error if session not found", async () => {
    // Mock database query returning empty result
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(db.select).mockReturnValue(mockSelect as any);

    // Process session should throw error
    await expect(processSession("nonexistent_session")).rejects.toThrow(
      "Session not found"
    );
  });
});

