/**
 * Integration Tests: Tutors API Endpoint
 * 
 * Tests for the GET /api/tutors endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Tutor scores must exist in tutor_scores table
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, tutorScores, flags } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

describe("Tutors API Endpoint", () => {
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
        "Database not available - skipping tutors API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return list of tutors with no filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("tutors");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.tutors)).toBe(true);
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("offset");
    expect(data.pagination).toHaveProperty("total");
  });

  it("should filter tutors by min_score", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const minScore = 50;
    const response = await fetch(`${baseUrl}/api/tutors?min_score=${minScore}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutors).toBeDefined();
    expect(Array.isArray(data.tutors)).toBe(true);
    
    // All returned tutors should have overall_score >= min_score
    if (data.tutors.length > 0) {
      data.tutors.forEach((tutor: any) => {
        if (tutor.overall_score !== null) {
          expect(tutor.overall_score).toBeGreaterThanOrEqual(minScore);
        }
      });
    }
  });

  it("should filter tutors by max_score", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const maxScore = 80;
    const response = await fetch(`${baseUrl}/api/tutors?max_score=${maxScore}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutors).toBeDefined();
    expect(Array.isArray(data.tutors)).toBe(true);
    
    // All returned tutors should have overall_score <= max_score
    if (data.tutors.length > 0) {
      data.tutors.forEach((tutor: any) => {
        if (tutor.overall_score !== null) {
          expect(tutor.overall_score).toBeLessThanOrEqual(maxScore);
        }
      });
    }
  });

  it("should filter tutors by has_flags", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Test with has_flags=true
    const response = await fetch(`${baseUrl}/api/tutors?has_flags=true`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutors).toBeDefined();
    expect(Array.isArray(data.tutors)).toBe(true);
    
    // All returned tutors should have flags
    if (data.tutors.length > 0) {
      data.tutors.forEach((tutor: any) => {
        expect(tutor.has_flags).toBe(true);
      });
    }
  });

  it("should sort tutors by score (DESC)", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors?sort_by=score&limit=10`);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.tutors.length > 1) {
      // Check that tutors are ordered by overall_score DESC
      for (let i = 0; i < data.tutors.length - 1; i++) {
        const current = data.tutors[i].overall_score;
        const next = data.tutors[i + 1].overall_score;
        // Handle null scores (should be at the end)
        if (current !== null && next !== null) {
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    }
  });

  it("should sort tutors by name (tutor_id)", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors?sort_by=name&limit=10`);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.tutors.length > 1) {
      // Check that tutors are ordered by tutor_id ASC
      for (let i = 0; i < data.tutors.length - 1; i++) {
        const current = data.tutors[i].tutor_id;
        const next = data.tutors[i + 1].tutor_id;
        expect(current <= next).toBe(true);
      }
    }
  });

  it("should sort tutors by session_count", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors?sort_by=session_count&limit=10`);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.tutors.length > 1) {
      // Check that tutors are ordered by total_sessions DESC
      for (let i = 0; i < data.tutors.length - 1; i++) {
        const current = data.tutors[i].total_sessions;
        const next = data.tutors[i + 1].total_sessions;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it("should paginate tutors with limit and offset", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const limit = 10;
    const offset = 0;

    const response = await fetch(
      `${baseUrl}/api/tutors?limit=${limit}&offset=${offset}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutors).toBeDefined();
    expect(Array.isArray(data.tutors)).toBe(true);
    expect(data.tutors.length).toBeLessThanOrEqual(limit);
    expect(data.pagination.limit).toBe(limit);
    expect(data.pagination.offset).toBe(offset);
    expect(data.pagination.total).toBeGreaterThanOrEqual(0);
  });

  it("should return pagination metadata", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors`);

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

  it("should return empty array when no tutors match filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Use a min_score that's very high (100) - might return empty if no tutors have perfect score
    // Or use a combination of filters that won't match
    const response = await fetch(`${baseUrl}/api/tutors?min_score=100&max_score=50`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutors).toBeDefined();
    expect(Array.isArray(data.tutors)).toBe(true);
    // This combination (min_score=100 and max_score=50) is impossible, so should return empty
    expect(data.tutors.length).toBe(0);
    expect(data.pagination.total).toBe(0);
  });

  it("should handle invalid query parameters gracefully", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Invalid limit (should be between 1-100)
    const response = await fetch(`${baseUrl}/api/tutors?limit=200`);

    // Should either return 400 or clamp to max (100)
    expect([200, 400]).toContain(response.status);
    
    if (response.status === 400) {
      const data = await response.json();
      expect(data).toHaveProperty("error");
    }
  });

  it("should include has_flags field in response", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/tutors?limit=10`);

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.tutors.length > 0) {
      data.tutors.forEach((tutor: any) => {
        expect(tutor).toHaveProperty("has_flags");
        expect(typeof tutor.has_flags).toBe("boolean");
      });
    }
  });
});

