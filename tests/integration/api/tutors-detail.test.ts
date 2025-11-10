/**
 * Integration Tests: Tutor Detail API Endpoint
 * 
 * Tests for the GET /api/tutors/[id] endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Tutor scores and sessions must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, tutorScores, sessions, flags, interventions } from "@/lib/db";

describe("Tutor Detail API Endpoint", () => {
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
        "Database not available - skipping tutor detail API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return tutor detail by tutor_id", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("tutor_id");
    expect(data.tutor_id).toBe(tutorId);
    expect(data).toHaveProperty("current_score");
    expect(data).toHaveProperty("recent_sessions");
    expect(data).toHaveProperty("active_flags");
    expect(data).toHaveProperty("performance_history");
    expect(data).toHaveProperty("interventions");
    expect(Array.isArray(data.recent_sessions)).toBe(true);
    expect(Array.isArray(data.active_flags)).toBe(true);
    expect(Array.isArray(data.performance_history)).toBe(true);
    expect(Array.isArray(data.interventions)).toBe(true);
  });

  it("should return 404 for non-existent tutor", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const nonExistentTutorId = "non-existent-tutor-id-12345";
    const response = await fetch(`${baseUrl}/api/tutors/${nonExistentTutorId}`);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should include current_score with all required fields", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.current_score).toBeDefined();
    expect(data.current_score).toHaveProperty("tutor_id");
    expect(data.current_score).toHaveProperty("overall_score");
    expect(data.current_score).toHaveProperty("total_sessions");
  });

  it("should include recent_sessions array", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.recent_sessions).toBeDefined();
    expect(Array.isArray(data.recent_sessions)).toBe(true);
    
    // If there are sessions, check structure
    if (data.recent_sessions.length > 0) {
      const session = data.recent_sessions[0];
      expect(session).toHaveProperty("session_id");
      expect(session).toHaveProperty("tutor_id");
      expect(session).toHaveProperty("student_id");
    }
  });

  it("should include active_flags array", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.active_flags).toBeDefined();
    expect(Array.isArray(data.active_flags)).toBe(true);
    
    // If there are flags, check structure
    if (data.active_flags.length > 0) {
      const flag = data.active_flags[0];
      expect(flag).toHaveProperty("id");
      expect(flag).toHaveProperty("tutor_id");
      expect(flag).toHaveProperty("flag_type");
      expect(flag).toHaveProperty("severity");
      expect(flag).toHaveProperty("status");
    }
  });

  it("should include performance_history array", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.performance_history).toBeDefined();
    expect(Array.isArray(data.performance_history)).toBe(true);
    
    // If there is history, check structure
    if (data.performance_history.length > 0) {
      const score = data.performance_history[0];
      expect(score).toHaveProperty("tutor_id");
      expect(score).toHaveProperty("calculated_at");
    }
  });

  it("should include interventions array", async () => {
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
    const response = await fetch(`${baseUrl}/api/tutors/${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.interventions).toBeDefined();
    expect(Array.isArray(data.interventions)).toBe(true);
    
    // If there are interventions, check structure
    if (data.interventions.length > 0) {
      const intervention = data.interventions[0];
      expect(intervention).toHaveProperty("id");
      expect(intervention).toHaveProperty("tutor_id");
    }
  });
});

