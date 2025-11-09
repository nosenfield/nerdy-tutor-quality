/**
 * Integration Tests: Session Detail API Endpoint
 * 
 * Tests for the GET /api/sessions/[id] endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

describe("Session Detail API Endpoint", () => {
  let baseUrl: string;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await db.select().from(sessions).limit(1);
      dbAvailable = true;
      baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
    } catch (error) {
      dbAvailable = false;
      console.warn(
        "Database not available - skipping session detail API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return session detail by session_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a session from database
    const [firstSession] = await db.select().from(sessions).limit(1);
    if (!firstSession) {
      console.log("Skipping test - no sessions in database");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions/${firstSession.sessionId}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("session");
    expect(data.session.session_id).toBe(firstSession.sessionId);
    expect(data.session.tutor_id).toBe(firstSession.tutorId);
    expect(data.session.student_id).toBe(firstSession.studentId);
  });

  it("should return 404 for non-existent session_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions/nonexistent_session_12345`
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("Not Found");
  });

  it("should return all session fields in response", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a session from database
    const [firstSession] = await db.select().from(sessions).limit(1);
    if (!firstSession) {
      console.log("Skipping test - no sessions in database");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions/${firstSession.sessionId}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    const session = data.session;

    // Check all required fields are present
    expect(session).toHaveProperty("id");
    expect(session).toHaveProperty("session_id");
    expect(session).toHaveProperty("tutor_id");
    expect(session).toHaveProperty("student_id");
    expect(session).toHaveProperty("session_start_time");
    expect(session).toHaveProperty("session_end_time");
    expect(session).toHaveProperty("subjects_covered");
    expect(session).toHaveProperty("is_first_session");
    expect(session).toHaveProperty("created_at");
    expect(session).toHaveProperty("updated_at");
  });

  it("should return session with optional fields when present", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a session with optional fields from database
    const [sessionWithFields] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tutorJoinTime, null))
      .limit(1);

    if (!sessionWithFields) {
      console.log("Skipping test - no suitable sessions in database");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions/${sessionWithFields.sessionId}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    const session = data.session;

    // Optional fields should be present (even if null)
    expect(session).toHaveProperty("tutor_join_time");
    expect(session).toHaveProperty("student_join_time");
    expect(session).toHaveProperty("tutor_leave_time");
    expect(session).toHaveProperty("student_leave_time");
    expect(session).toHaveProperty("tutor_feedback_rating");
    expect(session).toHaveProperty("student_feedback_rating");
  });
});

