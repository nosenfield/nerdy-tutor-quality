import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { generateMockSession, generateMockTutor, generateMockStudent } from "./generators";
import { SCENARIO_IDS, isChronicNoShowTutor, isAlwaysLateTutor } from "./scenarios";
import { differenceInMinutes } from "@/lib/utils/time";

describe("generateMockSession with noShowRate override", () => {
  beforeEach(() => {
    // Reset faker seed for consistent tests
    faker.seed(12345);
  });

  it("should respect noShowRate override parameter", () => {
    const tutor = generateMockTutor("excellent", 1);
    const student = generateMockStudent(1);
    
    // Generate 100 sessions with 16% no-show rate override
    const sessions = Array.from({ length: 100 }, () =>
      generateMockSession(tutor, student, {
        noShowRate: 0.16,
      })
    );

    const noShowCount = sessions.filter(
      (s) => s.tutorJoinTime === null || s.tutorJoinTime === undefined
    ).length;
    const noShowRate = noShowCount / sessions.length;

    // Should be approximately 16% (±5% tolerance for randomness)
    expect(noShowRate).toBeGreaterThanOrEqual(0.11);
    expect(noShowRate).toBeLessThanOrEqual(0.21);
  });

  it("should use persona default when no override provided", () => {
    const tutor = generateMockTutor("excellent", 1);
    const student = generateMockStudent(1);
    
    // Excellent tutors have 0% no-show rate
    const sessions = Array.from({ length: 100 }, () =>
      generateMockSession(tutor, student)
    );

    const noShowCount = sessions.filter(
      (s) => s.tutorJoinTime === null || s.tutorJoinTime === undefined
    ).length;

    // Excellent tutors should have no no-shows
    expect(noShowCount).toBe(0);
  });

  it("should generate no-show sessions with null tutorJoinTime and studentJoinTime", () => {
    const tutor = generateMockTutor("problematic", 1);
    const student = generateMockStudent(1);
    
    // Force a no-show with 100% probability
    const session = generateMockSession(tutor, student, {
      noShowRate: 1.0,
    });

    expect(session.tutorJoinTime).toBeUndefined();
    expect(session.studentJoinTime).toBeUndefined();
    expect(session.tutorLeaveTime).toBeUndefined();
    expect(session.studentLeaveTime).toBeUndefined();
  });
});

describe("generateMockSession with avgLatenessMinutes override", () => {
  beforeEach(() => {
    faker.seed(12345);
  });

  it("should respect avgLatenessMinutes override parameter", () => {
    const tutor = generateMockTutor("excellent", 1);
    const student = generateMockStudent(1);
    const scheduledStart = new Date("2025-11-05T10:00:00Z");
    
    // Generate 50 sessions with 15 min average lateness override
    const sessions = Array.from({ length: 50 }, () =>
      generateMockSession(tutor, student, {
        avgLatenessMinutes: 15,
        scheduledStartTime: scheduledStart,
      })
    );

    // All sessions should have tutor join times (not no-shows)
    const sessionsWithJoinTimes = sessions.filter(
      (s) => s.tutorJoinTime !== null && s.tutorJoinTime !== undefined
    );

    // Calculate average lateness
    const latenessValues = sessionsWithJoinTimes.map((s) => {
      const joinTime = s.tutorJoinTime instanceof Date ? s.tutorJoinTime : new Date(s.tutorJoinTime!);
      const scheduledStartTime = s.sessionStartTime instanceof Date ? s.sessionStartTime : new Date(s.sessionStartTime);
      return differenceInMinutes(scheduledStartTime, joinTime);
    });

    const avgLateness = latenessValues.reduce((sum, lateness) => sum + lateness, 0) / latenessValues.length;

    // Should be approximately 15 minutes (±3 min tolerance for variance)
    expect(avgLateness).toBeGreaterThanOrEqual(12);
    expect(avgLateness).toBeLessThanOrEqual(18);
  });

  it("should make tutor always late when avgLatenessMinutes override is provided", () => {
    const tutor = generateMockTutor("excellent", 1);
    const student = generateMockStudent(1);
    
    // Excellent tutors normally have 0% late rate, but override should force lateness
    const sessions = Array.from({ length: 20 }, () =>
      generateMockSession(tutor, student, {
        avgLatenessMinutes: 10,
      })
    );

    const lateSessions = sessions.filter((s) => {
      if (!s.tutorJoinTime) return false;
      const joinTime = s.tutorJoinTime instanceof Date ? s.tutorJoinTime : new Date(s.tutorJoinTime);
      const scheduledStart = s.sessionStartTime instanceof Date ? s.sessionStartTime : new Date(s.sessionStartTime);
      return differenceInMinutes(scheduledStart, joinTime) > 0;
    });

    // All sessions should be late when override is provided
    expect(lateSessions.length).toBe(sessions.length);
  });

  it("should use persona default when no override provided", () => {
    const tutor = generateMockTutor("excellent", 1);
    const student = generateMockStudent(1);
    
    // Excellent tutors have very low late rate
    const sessions = Array.from({ length: 100 }, () =>
      generateMockSession(tutor, student)
    );

    const lateSessions = sessions.filter((s) => {
      if (!s.tutorJoinTime) return false;
      const joinTime = s.tutorJoinTime instanceof Date ? s.tutorJoinTime : new Date(s.tutorJoinTime);
      const scheduledStart = s.sessionStartTime instanceof Date ? s.sessionStartTime : new Date(s.sessionStartTime);
      return differenceInMinutes(scheduledStart, joinTime) > 5; // More than 5 min late
    });

    // Excellent tutors should rarely be late
    expect(lateSessions.length).toBeLessThan(10);
  });
});

describe("chronic no-show tutor scenario", () => {
  it("should identify chronic no-show tutor correctly", () => {
    expect(isChronicNoShowTutor(SCENARIO_IDS.CHRONIC_NO_SHOW)).toBe(true);
    expect(isChronicNoShowTutor("tutor_00001")).toBe(false);
  });

  it("should generate approximately 16% no-show rate for chronic no-show tutor", () => {
    const tutor = generateMockTutor("problematic", 10000);
    const student = generateMockStudent(1);
    
    // Generate 100 sessions for chronic no-show tutor
    const sessions = Array.from({ length: 100 }, () =>
      generateMockSession(tutor, student, {
        noShowRate: 0.16, // 16% override
      })
    );

    const noShowCount = sessions.filter(
      (s) => s.tutorJoinTime === null || s.tutorJoinTime === undefined
    ).length;
    const noShowRate = noShowCount / sessions.length;

    // Should be approximately 16% (±5% tolerance)
    expect(noShowRate).toBeGreaterThanOrEqual(0.11);
    expect(noShowRate).toBeLessThanOrEqual(0.21);
  });
});

describe("always late tutor scenario", () => {
  it("should identify always late tutor correctly", () => {
    expect(isAlwaysLateTutor(SCENARIO_IDS.ALWAYS_LATE)).toBe(true);
    expect(isAlwaysLateTutor("tutor_00001")).toBe(false);
  });

  it("should generate approximately 15 min average lateness for always late tutor", () => {
    const tutor = generateMockTutor("problematic", 10001);
    const student = generateMockStudent(1);
    const scheduledStart = new Date("2025-11-05T10:00:00Z");
    
    // Generate 50 sessions for always late tutor
    const sessions = Array.from({ length: 50 }, () =>
      generateMockSession(tutor, student, {
        avgLatenessMinutes: 15, // 15 min override
        scheduledStartTime: scheduledStart,
      })
    );

    const sessionsWithJoinTimes = sessions.filter(
      (s) => s.tutorJoinTime !== null && s.tutorJoinTime !== undefined
    );

    const latenessValues = sessionsWithJoinTimes.map((s) => {
      const joinTime = s.tutorJoinTime instanceof Date ? s.tutorJoinTime : new Date(s.tutorJoinTime!);
      return differenceInMinutes(scheduledStart, joinTime);
    });

    const avgLateness = latenessValues.reduce((sum, lateness) => sum + lateness, 0) / latenessValues.length;

    // Should be approximately 15 minutes (±3 min tolerance)
    expect(avgLateness).toBeGreaterThanOrEqual(12);
    expect(avgLateness).toBeLessThanOrEqual(18);
  });
});
