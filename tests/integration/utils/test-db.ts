/**
 * Test Utilities for Integration Tests
 *
 * Helper functions for setting up and tearing down test database state.
 *
 * Note: Environment variables are loaded globally in tests/setup.ts
 */

/**
 * Setup test database
 * Resets and seeds the database with mock data
 */
export async function setupTestDatabase() {
  const { resetDatabase } = await import("../../../src/scripts/reset-db");
  const { seedMockData } = await import("../../../src/scripts/seed-mock-data");

  await resetDatabase();
  await seedMockData({
    tutorCount: 105, // Includes problem tutors
    sessionsPerTutor: 30,
    daysBack: 30,
    includeProblemTutors: true,
  });
}

/**
 * Teardown test database
 * Cleans up test data
 */
export async function teardownTestDatabase() {
  const { resetDatabase } = await import("../../../src/scripts/reset-db");
  await resetDatabase();
}

/**
 * Get sessions for a tutor
 */
export async function getTutorSessions(tutorId: string) {
  const { db } = await import("../../../src/lib/db");
  const { sessions } = await import("../../../src/lib/db/schema");
  const { eq, asc } = await import("drizzle-orm");

  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.tutorId, tutorId))
    .orderBy(asc(sessions.sessionStartTime));
}

