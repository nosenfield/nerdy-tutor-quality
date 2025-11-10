/**
 * Integration Tests: Flag Detail API Endpoint
 * 
 * Tests for the GET /api/flags/[id] endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Flags must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, flags } from "@/lib/db";

describe("Flag Detail API Endpoint", () => {
  let baseUrl: string;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await db.select().from(flags).limit(1);
      dbAvailable = true;
      baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
    } catch (error) {
      dbAvailable = false;
      console.warn(
        "Database not available - skipping flag detail API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return flag detail by flag id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a flag from the database
    const flag = await db.select().from(flags).limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no flags in database");
      return;
    }

    const flagId = flag[0].id;
    const response = await fetch(`${baseUrl}/api/flags/${flagId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("flag");
    expect(data).toHaveProperty("tutor");
    expect(data).toHaveProperty("related_sessions");
    expect(data).toHaveProperty("interventions");
    expect(data.flag).toHaveProperty("id");
    expect(data.flag.id).toBe(flagId);
    expect(data.tutor).toHaveProperty("tutor_id");
    expect(data.tutor).toHaveProperty("current_score");
    expect(Array.isArray(data.related_sessions)).toBe(true);
    expect(Array.isArray(data.interventions)).toBe(true);
  });

  it("should return 404 for non-existent flag", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const nonExistentFlagId = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${baseUrl}/api/flags/${nonExistentFlagId}`);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should include tutor information", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const flag = await db.select().from(flags).limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no flags in database");
      return;
    }

    const flagId = flag[0].id;
    const response = await fetch(`${baseUrl}/api/flags/${flagId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tutor).toBeDefined();
    expect(data.tutor).toHaveProperty("tutor_id");
    expect(data.tutor).toHaveProperty("current_score");
    expect(data.tutor.current_score).toHaveProperty("tutor_id");
  });

  it("should include related_sessions array", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const flag = await db.select().from(flags).limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no flags in database");
      return;
    }

    const flagId = flag[0].id;
    const response = await fetch(`${baseUrl}/api/flags/${flagId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.related_sessions).toBeDefined();
    expect(Array.isArray(data.related_sessions)).toBe(true);
    
    // If there are sessions, check structure
    if (data.related_sessions.length > 0) {
      const session = data.related_sessions[0];
      expect(session).toHaveProperty("session_id");
      expect(session).toHaveProperty("tutor_id");
    }
  });

  it("should include interventions array", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const flag = await db.select().from(flags).limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no flags in database");
      return;
    }

    const flagId = flag[0].id;
    const response = await fetch(`${baseUrl}/api/flags/${flagId}`);

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

