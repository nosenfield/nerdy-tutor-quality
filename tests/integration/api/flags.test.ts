/**
 * Integration Tests: Flags API Endpoint
 * 
 * Tests for the GET /api/flags endpoint.
 * 
 * Prerequisites:
 * - Database must be available (DATABASE_URL in .env.local)
 * - Flags must exist in database
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db, flags } from "@/lib/db";

describe("Flags API Endpoint", () => {
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
        "Database not available - skipping flags API tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }
  });

  it("should return list of flags with no filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/flags`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("flags");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.flags)).toBe(true);
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("offset");
    expect(data.pagination).toHaveProperty("total");
  });

  it("should filter flags by tutor_id", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Get a tutor_id from the database
    const flag = await db.select().from(flags).limit(1);
    if (flag.length === 0) {
      console.log("Skipping test - no flags in database");
      return;
    }

    const tutorId = flag[0].tutorId;
    const response = await fetch(`${baseUrl}/api/flags?tutor_id=${tutorId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    
    // All returned flags should have the same tutor_id
    if (data.flags.length > 0) {
      data.flags.forEach((f: any) => {
        expect(f.tutor_id).toBe(tutorId);
      });
    }
  });

  it("should filter flags by status", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/flags?status=open`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    
    // All returned flags should have status 'open'
    if (data.flags.length > 0) {
      data.flags.forEach((f: any) => {
        expect(f.status).toBe("open");
      });
    }
  });

  it("should filter flags by severity", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/flags?severity=high`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    
    // All returned flags should have severity 'high'
    if (data.flags.length > 0) {
      data.flags.forEach((f: any) => {
        expect(f.severity).toBe("high");
      });
    }
  });

  it("should paginate flags with limit and offset", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const limit = 10;
    const offset = 0;

    const response = await fetch(
      `${baseUrl}/api/flags?limit=${limit}&offset=${offset}`
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    expect(data.flags.length).toBeLessThanOrEqual(limit);
    expect(data.pagination.limit).toBe(limit);
    expect(data.pagination.offset).toBe(offset);
    expect(data.pagination.total).toBeGreaterThanOrEqual(0);
  });

  it("should return pagination metadata", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    const response = await fetch(`${baseUrl}/api/flags`);

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

  it("should return empty array when no flags match filters", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Use a tutor_id that doesn't exist
    const response = await fetch(`${baseUrl}/api/flags?tutor_id=non-existent-tutor-id-12345`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toBeDefined();
    expect(Array.isArray(data.flags)).toBe(true);
    expect(data.flags.length).toBe(0);
    expect(data.pagination.total).toBe(0);
  });

  it("should handle invalid query parameters gracefully", async () => {
    if (!dbAvailable) {
      console.log("Skipping test - database not available");
      return;
    }

    // Invalid status (should be one of: open, in_progress, resolved, dismissed)
    const response = await fetch(`${baseUrl}/api/flags?status=invalid`);

    // Should either return 400 or filter to empty results
    expect([200, 400]).toContain(response.status);
    
    if (response.status === 400) {
      const data = await response.json();
      expect(data).toHaveProperty("error");
    }
  });
});

