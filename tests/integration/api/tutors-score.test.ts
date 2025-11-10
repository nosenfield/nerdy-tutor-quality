/**
 * Integration Tests: Tutor Score API Endpoint
 * 
 * Tests for the GET /api/tutors/[id]/score endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Tutor scores must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, tutorScores, flags } from "@/lib/db";

describe("Tutor Score API Endpoint", () => {
  let baseUrl: string;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await db.select().from(tutorScores).limit(1);
      dbAvailable = true;
      baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
    } catch (error) {
      dbAvailable = false;
      console.warn(
        "Database not available - skipping tutor score API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return tutor score by tutor_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a tutor_id from the database
    const tutorScore = await db.select().from(tutorScores).limit(1);
    if (tutorScore.length === 0) {
      console.log("Skipping test - no tutor scores in database");
      return;
    }

    const tutorId = tutorScore[0].tutorId;
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}/score`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("score");
    expect(data).toHaveProperty("breakdown");
    expect(data).toHaveProperty("flags");
    expect(data.score).toHaveProperty("tutor_id");
    expect(data.score).toHaveProperty("overall_score");
    expect(data.breakdown).toHaveProperty("attendance");
    expect(data.breakdown).toHaveProperty("ratings");
    expect(data.breakdown).toHaveProperty("completion");
    expect(data.breakdown).toHaveProperty("reliability");
    expect(Array.isArray(data.flags)).toBe(true);
  });

  it("should return 404 for non-existent tutor", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const nonExistentTutorId = "non-existent-tutor-id-12345";
    const response = await fetch(`${baseUrl}/api/tutors/${nonExistentTutorId}/score`);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should include score breakdown with all components", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const tutorScore = await db.select().from(tutorScores).limit(1);
    if (tutorScore.length === 0) {
      console.log("Skipping test - no tutor scores in database");
      return;
    }

    const tutorId = tutorScore[0].tutorId;
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}/score`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.breakdown).toBeDefined();
    expect(typeof data.breakdown.attendance).toBe("number");
    expect(typeof data.breakdown.ratings).toBe("number");
    expect(typeof data.breakdown.completion).toBe("number");
    expect(typeof data.breakdown.reliability).toBe("number");
    
    // Scores should be between 0-100
    expect(data.breakdown.attendance).toBeGreaterThanOrEqual(0);
    expect(data.breakdown.attendance).toBeLessThanOrEqual(100);
    expect(data.breakdown.ratings).toBeGreaterThanOrEqual(0);
    expect(data.breakdown.ratings).toBeLessThanOrEqual(100);
    expect(data.breakdown.completion).toBeGreaterThanOrEqual(0);
    expect(data.breakdown.completion).toBeLessThanOrEqual(100);
    expect(data.breakdown.reliability).toBeGreaterThanOrEqual(0);
    expect(data.breakdown.reliability).toBeLessThanOrEqual(100);
  });

  it("should include flags array", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const tutorScore = await db.select().from(tutorScores).limit(1);
    if (tutorScore.length === 0) {
      console.log("Skipping test - no tutor scores in database");
      return;
    }

    const tutorId = tutorScore[0].tutorId;
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}/score`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    
    // If there are flags, check structure
    if (data.flags.length > 0) {
      const flag = data.flags[0];
      expect(flag).toHaveProperty("id");
      expect(flag).toHaveProperty("tutor_id");
      expect(flag).toHaveProperty("flag_type");
      expect(flag).toHaveProperty("severity");
    }
  });
});

