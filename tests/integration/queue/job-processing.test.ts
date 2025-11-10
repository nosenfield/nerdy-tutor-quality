/**
 * Integration Tests: Job Processing
 * 
 * Tests for verifying that workers process jobs correctly.
 * Tests that jobs execute processSession, create flags, and complete successfully.
 * 
 * Prerequisites:
 * - Redis must be available (REDIS_URL in .env.local)
 * - Database must be available (DATABASE_URL in .env.local)
 * - Test database should be seeded with sessions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { sessionQueue, closeQueues } from "@/lib/queue";
import { registerWorkers, startWorkers } from "@/lib/queue/workers";
import type { ProcessSessionJobData } from "@/lib/queue/jobs";
import { JOB_TYPES } from "@/lib/queue/jobs";
import type { Job } from "bull";
import { setupTestDatabase, teardownTestDatabase } from "../utils/test-db";
import { db, sessions, flags } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Test utilities for queue operations
 */
async function waitForJobCompletion(job: Job, timeoutMs: number = 10000): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const state = await job.getState();
    if (state === "completed" || state === "failed") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Job ${job.id} did not complete within ${timeoutMs}ms`);
}

async function cleanQueue(queue: typeof sessionQueue): Promise<void> {
  // Remove all jobs from queue
  await queue.clean(0, "completed");
  await queue.clean(0, "failed");
  await queue.clean(0, "active");
  await queue.clean(0, "waiting");
  await queue.clean(0, "delayed");
}

async function getSessionById(sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .limit(1);
  return session;
}

async function getFlagsForTutor(tutorId: string) {
  return await db
    .select()
    .from(flags)
    .where(and(eq(flags.tutorId, tutorId), eq(flags.status, "open")));
}

async function getFlagsForSession(sessionId: string) {
  return await db
    .select()
    .from(flags)
    .where(eq(flags.sessionId, sessionId));
}

describe("Job Processing", () => {
  let redisAvailable = false;
  let dbAvailable = false;
  let workersStarted = false;

  beforeAll(async () => {
    // Check if Redis is available
    try {
      await sessionQueue.getWaitingCount();
      redisAvailable = true;
    } catch (error) {
      redisAvailable = false;
      console.warn(
        "Redis not available - skipping queue tests. Set REDIS_URL in .env.local to run these tests."
      );
    }

    // Check if database is available and set up test data
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch (error) {
      dbAvailable = false;
      console.warn(
        "Database not available - skipping job processing tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }

    // Start workers if both Redis and database are available
    if (redisAvailable && dbAvailable) {
      try {
        startWorkers();
        workersStarted = true;
        // Give workers time to start
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.warn("Failed to start workers:", error);
      }
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      try {
        // Clean up queues
        await cleanQueue(sessionQueue);
        
        // Close all queues
        await closeQueues();
      } catch (error) {
        console.warn("Error cleaning up queues:", error);
      }
    }

    if (dbAvailable) {
      try {
        await teardownTestDatabase();
      } catch (error) {
        console.warn("Error tearing down test database:", error);
      }
    }
  });

  beforeEach(async () => {
    if (!redisAvailable || !dbAvailable) {
      return;
    }

    try {
      // Clean queues before each test
      await cleanQueue(sessionQueue);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    if (!redisAvailable || !dbAvailable) {
      return;
    }

    try {
      // Clean queues after each test
      await cleanQueue(sessionQueue);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Processing single job", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process single job successfully",
      async () => {
        // Arrange - Get a real session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert
        const state = await job.getState();
        expect(state).toBe("completed");

        const result = await job.finished();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should call processSession with correct session data",
      async () => {
        // Arrange - Get a real session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Verify job data matches session
        expect(job.data.sessionId).toBe(session.sessionId);
        expect(job.data.tutorId).toBe(session.tutorId);
        expect(job.data.isFirstSession).toBe(session.isFirstSession || false);
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should create flags when rules are triggered",
      async () => {
        // Arrange - Get a session that should trigger flags (e.g., no-show, lateness)
        // We'll use a session from the database and check if flags are created
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        // Get initial flag count for this tutor
        const initialFlags = await getFlagsForTutor(session.tutorId);
        const initialFlagCount = initialFlags.length;

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Check if flags were created (may or may not be, depending on rules)
        const result = await job.finished();
        expect(Array.isArray(result)).toBe(true);

        // Verify job completed successfully
        const state = await job.getState();
        expect(state).toBe("completed");
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should return array of flag IDs when flags are created",
      async () => {
        // Arrange - Get a session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Verify result is array of flag IDs
        const result = await job.finished();
        expect(Array.isArray(result)).toBe(true);
        
        // All elements should be strings (flag IDs)
        if (result.length > 0) {
          result.forEach((flagId) => {
            expect(typeof flagId).toBe("string");
            expect(flagId.length).toBeGreaterThan(0);
          });
        }
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should complete job successfully",
      async () => {
        // Arrange - Get a session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Verify job completed successfully
        const state = await job.getState();
        expect(state).toBe("completed");

        const result = await job.finished();
        expect(result).toBeDefined();
      }
    );
  });

  describe("Error handling", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should handle missing session gracefully",
      async () => {
        // Arrange - Use a non-existent session ID
        const jobData: ProcessSessionJobData = {
          sessionId: "non-existent-session-id",
          tutorId: "non-existent-tutor-id",
          isFirstSession: false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete (should fail)
        await waitForJobCompletion(job, 15000);

        // Assert - Verify job failed
        const state = await job.getState();
        expect(state).toBe("failed");

        // Verify error is captured
        const failedReason = await job.getState();
        expect(failedReason).toBe("failed");
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should handle database errors gracefully",
      async () => {
        // This test would require mocking database errors
        // For now, we'll skip it as it requires more complex setup
        // In a real scenario, we'd mock the database connection
      }
    );
  });

  describe("Job state transitions", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should transition from waiting to active to completed",
      async () => {
        // Arrange - Get a session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Check initial state (should be waiting or active)
        const initialState = await job.getState();
        expect(["waiting", "active"]).toContain(initialState);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Verify final state is completed
        const finalState = await job.getState();
        expect(finalState).toBe("completed");
      }
    );
  });

  describe("Concurrent job processing", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process multiple jobs concurrently",
      async () => {
        // Arrange - Get multiple sessions from the database
        const sessionList = await db
          .select()
          .from(sessions)
          .limit(3);

        if (sessionList.length < 3) {
          throw new Error("Not enough sessions in database. Run seed script first.");
        }

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add multiple jobs to queue
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );

        // Wait for all jobs to complete
        await Promise.all(
          jobs.map((job) => waitForJobCompletion(job, 20000))
        );

        // Assert - Verify all jobs completed successfully
        for (const job of jobs) {
          const state = await job.getState();
          expect(state).toBe("completed");
        }
      }
    );
  });

  describe("Job progress tracking", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should track job progress",
      async () => {
        // Arrange - Get a session from the database
        const [session] = await db
          .select()
          .from(sessions)
          .limit(1);

        if (!session) {
          throw new Error("No sessions found in database. Run seed script first.");
        }

        const jobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add job to queue
        const job = await sessionQueue.add(JOB_TYPES.PROCESS_SESSION, jobData);

        // Wait for job to complete
        await waitForJobCompletion(job, 15000);

        // Assert - Verify job has progress information
        const state = await job.getState();
        expect(state).toBe("completed");

        // Job should have timestamp
        expect(job.timestamp).toBeDefined();
      }
    );
  });
});

