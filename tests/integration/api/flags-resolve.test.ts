/**
 * Integration Tests: Flag Resolve API Endpoint
 * 
 * Tests for the POST /api/flags/[id]/resolve endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Flags must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, flags, interventions } from "@/lib/db";
import { eq } from "drizzle-orm";

describe("Flag Resolve API Endpoint", () => {
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
        "Database not available - skipping flag resolve API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should resolve a flag with resolution notes", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get an open flag from the database
    const flag = await db
      .select()
      .from(flags)
      .where(eq(flags.status, "open"))
      .limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no open flags in database");
      return;
    }

    const flagId = flag[0].id;
    const requestBody = {
      resolution_notes: "Test resolution notes",
      coach_agreed: true,
    };

    const response = await fetch(`${baseUrl}/api/flags/${flagId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("flag");
    expect(data.flag).toHaveProperty("id");
    expect(data.flag.id).toBe(flagId);
    expect(data.flag).toHaveProperty("status");
    expect(data.flag.status).toBe("resolved");
    expect(data.flag).toHaveProperty("resolution_notes");
    expect(data.flag.resolution_notes).toBe(requestBody.resolution_notes);
    expect(data.flag).toHaveProperty("coach_agreed");
    expect(data.flag.coach_agreed).toBe(requestBody.coach_agreed);
    expect(data.flag).toHaveProperty("resolved_at");
    expect(data.flag.resolved_at).toBeDefined();
  });

  it("should create an intervention when intervention_type is provided", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get an open flag from the database
    const flag = await db
      .select()
      .from(flags)
      .where(eq(flags.status, "open"))
      .limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no open flags in database");
      return;
    }

    const flagId = flag[0].id;
    const tutorId = flag[0].tutorId;
    const requestBody = {
      resolution_notes: "Test resolution with intervention",
      coach_agreed: true,
      intervention_type: "coaching_session",
      intervention_description: "Test intervention description",
    };

    const response = await fetch(`${baseUrl}/api/flags/${flagId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("flag");
    expect(data).toHaveProperty("intervention");
    expect(data.intervention).toBeDefined();
    expect(data.intervention).toHaveProperty("id");
    expect(data.intervention).toHaveProperty("tutor_id");
    expect(data.intervention.tutor_id).toBe(tutorId);
    expect(data.intervention).toHaveProperty("intervention_type");
    expect(data.intervention.intervention_type).toBe(requestBody.intervention_type);
    expect(data.intervention).toHaveProperty("description");
    expect(data.intervention.description).toBe(requestBody.intervention_description);
  });

  it("should return 404 for non-existent flag", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const nonExistentFlagId = "00000000-0000-0000-0000-000000000000";
    const requestBody = {
      resolution_notes: "Test resolution notes",
      coach_agreed: true,
    };

    const response = await fetch(
      `${baseUrl}/api/flags/${nonExistentFlagId}/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("should return 400 for invalid request body", async () => {
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
    const requestBody = {
      // Missing required fields
      coach_agreed: true,
    };

    const response = await fetch(`${baseUrl}/api/flags/${flagId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

