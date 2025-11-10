/**
 * Integration Tests: Analytics Overview API Endpoint
 * 
 * Tests for the GET /api/analytics/overview endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Tutor scores, flags, and sessions must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, tutorScores, flags, sessions } from "@/lib/db";

describe("Analytics Overview API Endpoint", () => {
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
        "Database not available - skipping analytics overview API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return analytics overview with correct structure", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/analytics/overview`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("today");
    expect(data).toHaveProperty("trends");
    expect(data).toHaveProperty("top_issues");
    expect(data.today).toHaveProperty("sessions_processed");
    expect(data.today).toHaveProperty("flags_raised");
    expect(data.today).toHaveProperty("tutors_flagged");
    expect(data.trends).toHaveProperty("avg_score");
    expect(data.trends).toHaveProperty("avg_score_change");
    expect(data.trends).toHaveProperty("flag_rate");
    expect(data.trends).toHaveProperty("flag_rate_change");
    expect(Array.isArray(data.top_issues)).toBe(true);
  });

  it("should return today's stats with correct types", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/analytics/overview`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(typeof data.today.sessions_processed).toBe("number");
    expect(typeof data.today.flags_raised).toBe("number");
    expect(typeof data.today.tutors_flagged).toBe("number");
    expect(data.today.sessions_processed).toBeGreaterThanOrEqual(0);
    expect(data.today.flags_raised).toBeGreaterThanOrEqual(0);
    expect(data.today.tutors_flagged).toBeGreaterThanOrEqual(0);
  });

  it("should return trends with correct types", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/analytics/overview`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(typeof data.trends.avg_score).toBe("number");
    expect(typeof data.trends.avg_score_change).toBe("number");
    expect(typeof data.trends.flag_rate).toBe("number");
    expect(typeof data.trends.flag_rate_change).toBe("number");
    
    // avg_score should be between 0-100 or null
    if (data.trends.avg_score !== null) {
      expect(data.trends.avg_score).toBeGreaterThanOrEqual(0);
      expect(data.trends.avg_score).toBeLessThanOrEqual(100);
    }
    
    // flag_rate should be between 0-1 or null
    if (data.trends.flag_rate !== null) {
      expect(data.trends.flag_rate).toBeGreaterThanOrEqual(0);
      expect(data.trends.flag_rate).toBeLessThanOrEqual(1);
    }
  });

  it("should return top_issues array with correct structure", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/analytics/overview`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.top_issues)).toBe(true);
    
    // If there are issues, check structure
    if (data.top_issues.length > 0) {
      const issue = data.top_issues[0];
      expect(issue).toHaveProperty("issue");
      expect(issue).toHaveProperty("count");
      expect(typeof issue.issue).toBe("string");
      expect(typeof issue.count).toBe("number");
      expect(issue.count).toBeGreaterThan(0);
    }
  });

  it("should handle empty data gracefully", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/analytics/overview`);

    expect(response.status).toBe(200);
    const data = await response.json();
    // Should still return valid structure even with no data
    expect(data).toHaveProperty("today");
    expect(data).toHaveProperty("trends");
    expect(data).toHaveProperty("top_issues");
  });
});

