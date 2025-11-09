/**
 * Integration Tests: Session Completed Webhook
 * 
 * Tests for the session-completed webhook endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Redis must be available (REDIS_URL in .env.local)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { WebhookPayload } from "@/lib/utils/validation";

/**
 * Test webhook payload
 */
function createTestWebhookPayload(overrides?: Partial<WebhookPayload>): WebhookPayload {
  const now = new Date();
  const sessionStartTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const sessionEndTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
  const tutorJoinTime = new Date(sessionStartTime.getTime() + 5 * 60 * 1000); // 5 min late

  return {
    session_id: `test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    tutor_id: "test_tutor_123",
    student_id: "test_student_456",
    session_start_time: sessionStartTime.toISOString(),
    session_end_time: sessionEndTime.toISOString(),
    tutor_join_time: tutorJoinTime.toISOString(),
    student_join_time: tutorJoinTime.toISOString(),
    tutor_leave_time: sessionEndTime.toISOString(),
    student_leave_time: sessionEndTime.toISOString(),
    subjects_covered: ["Math", "Algebra"],
    is_first_session: false,
    was_rescheduled: false,
    tutor_feedback: {
      rating: 4,
      description: "Good session",
    },
    student_feedback: {
      rating: 5,
      description: "Excellent tutor",
    },
    ...overrides,
  };
}

describe("Session Completed Webhook", () => {
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
        "Database not available - skipping webhook tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Clean up test sessions before each test
    const testSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "test_session_%"));
    // Note: This is a simplified cleanup - in production, use proper test data isolation
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    // Clean up test sessions after all tests
    // Note: This is a simplified cleanup - in production, use proper test data isolation
  });

  it("should accept valid webhook payload", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const payload = createTestWebhookPayload();

    const response = await fetch(`${baseUrl}/api/webhooks/session-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.session_id).toBe(payload.session_id);
    expect(data.queued).toBe(true);

    // Verify session was stored in database
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, payload.session_id))
      .limit(1);

    expect(session).toBeDefined();
    expect(session?.sessionId).toBe(payload.session_id);
    expect(session?.tutorId).toBe(payload.tutor_id);
    expect(session?.studentId).toBe(payload.student_id);
  });

  it("should reject invalid webhook payload", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const invalidPayload = {
      session_id: "", // Invalid: empty string
      tutor_id: "test_tutor_123",
      // Missing required fields
    };

    const response = await fetch(`${baseUrl}/api/webhooks/session-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidPayload),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid payload");
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
  });

  it("should handle duplicate session_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const payload = createTestWebhookPayload();

    // First request should succeed
    const response1 = await fetch(`${baseUrl}/api/webhooks/session-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response1.status).toBe(200);

    // Second request with same session_id should return 409
    const response2 = await fetch(`${baseUrl}/api/webhooks/session-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response2.status).toBe(409);
    const data = await response2.json();
    expect(data.error).toBe("Session already exists");
    expect(data.session_id).toBe(payload.session_id);
  });

  it("should queue high priority job for first sessions", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const payload = createTestWebhookPayload({
      is_first_session: true,
    });

    const response = await fetch(`${baseUrl}/api/webhooks/session-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.queued).toBe(true);

    // Note: Verifying job priority would require checking the queue,
    // which is tested in queue integration tests
  });
});

