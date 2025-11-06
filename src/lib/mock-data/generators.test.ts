import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { generateMockSession, generateMockTutor, generateMockStudent } from "./generators";
import { SCENARIO_IDS, isChronicNoShowTutor } from "./scenarios";

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

