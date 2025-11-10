/**
 * Integration Tests: Analytics Trends API Endpoint
 * 
 * Tests for the GET /api/analytics/trends endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Tutor scores must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, tutorScores } from "@/lib/db";

describe("Analytics Trends API Endpoint", () => {
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
        "Database not available - skipping analytics trends API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return trends data with correct structure", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/analytics/trends?metric=avg_score&period=30d&group_by=day`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("metric");
    expect(data).toHaveProperty("period");
    expect(data).toHaveProperty("group_by");
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("should support different metrics", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const metrics = ["avg_score", "flag_rate", "no_show_rate", "reschedule_rate"];

    for (const metric of metrics) {
      const response = await fetch(
        `${baseUrl}/api/analytics/trends?metric=${metric}&period=30d&group_by=day`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metric).toBe(metric);
      expect(Array.isArray(data.data)).toBe(true);
    }
  });

  it("should support different periods", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const periods = ["7d", "30d", "90d", "1y"];

    for (const period of periods) {
      const response = await fetch(
        `${baseUrl}/api/analytics/trends?metric=avg_score&period=${period}&group_by=day`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.period).toBe(period);
      expect(Array.isArray(data.data)).toBe(true);
    }
  });

  it("should support different group_by values", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const groupByValues = ["day", "week", "month"];

    for (const groupBy of groupByValues) {
      const response = await fetch(
        `${baseUrl}/api/analytics/trends?metric=avg_score&period=30d&group_by=${groupBy}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.group_by).toBe(groupBy);
      expect(Array.isArray(data.data)).toBe(true);
    }
  });

  it("should return data points with correct structure", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/analytics/trends?metric=avg_score&period=30d&group_by=day`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    
    if (data.data.length > 0) {
      const point = data.data[0];
      expect(point).toHaveProperty("date");
      expect(point).toHaveProperty("value");
      expect(typeof point.date).toBe("string");
      expect(typeof point.value).toBe("number");
    }
  });

  it("should return 400 for invalid metric", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/analytics/trends?metric=invalid_metric&period=30d&group_by=day`
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for invalid period", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/analytics/trends?metric=avg_score&period=invalid&group_by=day`
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for invalid group_by", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/analytics/trends?metric=avg_score&period=30d&group_by=invalid`
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for missing required parameters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Missing metric
    const response1 = await fetch(
      `${baseUrl}/api/analytics/trends?period=30d&group_by=day`
    );
    expect(response1.status).toBe(400);

    // Missing period
    const response2 = await fetch(
      `${baseUrl}/api/analytics/trends?metric=avg_score&group_by=day`
    );
    expect(response2.status).toBe(400);
  });
});

