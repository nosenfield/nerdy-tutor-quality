/**
 * Integration Tests: Sessions API Endpoint
 * 
 * Tests for the GET /api/sessions endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, sessions } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";

describe("Sessions API Endpoint", () => {
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
        "Database not available - skipping sessions API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return list of sessions with no filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/sessions`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("sessions");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("offset");
    expect(data.pagination).toHaveProperty("total");
  });

  it("should filter sessions by tutor_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a tutor_id from existing sessions
    const [firstSession] = await db.select().from(sessions).limit(1);
    if (!firstSession) {
      console.log("Skipping test - no sessions in database");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions?tutor_id=${firstSession.tutorId}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    
    // All returned sessions should have the same tutor_id
    if (data.sessions.length > 0) {
      data.sessions.forEach((session: any) => {
        expect(session.tutor_id).toBe(firstSession.tutorId);
      });
    }
  });

  it("should filter sessions by student_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a student_id from existing sessions
    const [firstSession] = await db.select().from(sessions).limit(1);
    if (!firstSession) {
      console.log("Skipping test - no sessions in database");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions?student_id=${firstSession.studentId}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    
    // All returned sessions should have the same student_id
    if (data.sessions.length > 0) {
      data.sessions.forEach((session: any) => {
        expect(session.student_id).toBe(firstSession.studentId);
      });
    }
  });

  it("should filter sessions by date range", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();

    const response = await fetch(
      `${baseUrl}/api/sessions?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    
    // All returned sessions should be within date range
    if (data.sessions.length > 0) {
      data.sessions.forEach((session: any) => {
        const sessionDate = new Date(session.session_start_time);
        expect(sessionDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(sessionDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    }
  });

  it("should filter sessions by is_first_session", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/sessions?is_first_session=true`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    
    // All returned sessions should be first sessions
    if (data.sessions.length > 0) {
      data.sessions.forEach((session: any) => {
        expect(session.is_first_session).toBe(true);
      });
    }
  });

  it("should paginate sessions with limit and offset", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const limit = 10;
    const offset = 0;

    const response = await fetch(
      `${baseUrl}/api/sessions?limit=${limit}&offset=${offset}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions.length).toBeLessThanOrEqual(limit);
    expect(data.pagination.limit).toBe(limit);
    expect(data.pagination.offset).toBe(offset);
    expect(data.pagination.total).toBeGreaterThanOrEqual(0);
  });

  it("should return pagination metadata", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/sessions`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination).toBeDefined();
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("offset");
    expect(data.pagination).toHaveProperty("total");
    expect(typeof data.pagination.limit).toBe("number");
    expect(typeof data.pagination.offset).toBe("number");
    expect(typeof data.pagination.total).toBe("number");
  });

  it("should return empty array when no sessions match filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Use a tutor_id that doesn't exist
    const response = await fetch(
      `${baseUrl}/api/sessions?tutor_id=nonexistent_tutor_12345`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions.length).toBe(0);
    expect(data.pagination.total).toBe(0);
  });

  it("should handle invalid query parameters gracefully", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Invalid limit (should be between 1-100)
    const response = await fetch(`${baseUrl}/api/sessions?limit=200`);

    // Should either return 400 or clamp to max (100)
    expect([200, 400]).toContain(response.status);
    
    if (response.status === 400) {
      const data = await response.json();
      expect(data).toHaveProperty("error");
    }
  });

  it("should order sessions by session_start_time DESC", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/sessions?limit=10`);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.sessions.length > 1) {
      // Check that sessions are ordered by session_start_time DESC
      for (let i = 0; i < data.sessions.length - 1; i++) {
        const current = new Date(data.sessions[i].session_start_time);
        const next = new Date(data.sessions[i + 1].session_start_time);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }
  });
});

