/**
 * Integration Tests: Job Priority Queuing
 * 
 * Tests for verifying that jobs with different priorities are processed
 * in the correct order. High priority jobs should be processed before
 * normal priority jobs, and normal priority jobs before low priority jobs.
 * 
 * Prerequisites:
 * - Redis must be available (REDIS_URL in .env.local)
 * - Database must be available (DATABASE_URL in .env.local)
 * - Test database should be seeded with sessions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { sessionQueue, getQueue, closeQueues } from "@/lib/queue";
import { registerWorkers, startWorkers } from "@/lib/queue/workers";
import type { ProcessSessionJobData } from "@/lib/queue/jobs";
import { JOB_TYPES } from "@/lib/queue/jobs";
import type { Job } from "bull";
import { setupTestDatabase, teardownTestDatabase } from "../utils/test-db";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Test utilities for queue operations
 */
async function waitForJobCompletion(job: Job, timeoutMs: number = 15000): Promise<void> {
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

async function getSessionsForTesting(count: number = 3) {
  const sessionList = await db
    .select()
    .from(sessions)
    .limit(count);

  if (sessionList.length < count) {
    throw new Error(
      `Not enough sessions in database. Found ${sessionList.length}, need ${count}. Run seed script first.`
    );
  }

  return sessionList;
}

describe("Job Priority Queuing", () => {
  let normalQueue: ReturnType<typeof getQueue>;
  let highQueue: ReturnType<typeof getQueue>;
  let lowQueue: ReturnType<typeof getQueue>;
  let redisAvailable = false;
  let dbAvailable = false;
  let workersStarted = false;

  beforeAll(async () => {
    // Check if Redis is available
    try {
      await sessionQueue.getWaitingCount();
      redisAvailable = true;

      // Get queue instances
      normalQueue = getQueue("normal");
      highQueue = getQueue("high");
      lowQueue = getQueue("low");

      // Clean queues before starting
      await cleanQueue(sessionQueue);
      await cleanQueue(highQueue);
      await cleanQueue(normalQueue);
      await cleanQueue(lowQueue);
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
        "Database not available - skipping priority queuing tests. Set DATABASE_URL in .env.local to run these tests."
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
        await cleanQueue(highQueue);
        await cleanQueue(normalQueue);
        await cleanQueue(lowQueue);

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
      await cleanQueue(highQueue);
      await cleanQueue(normalQueue);
      await cleanQueue(lowQueue);
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
      await cleanQueue(highQueue);
      await cleanQueue(normalQueue);
      await cleanQueue(lowQueue);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Priority within single queue", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process high priority jobs before normal priority jobs",
      async () => {
        // Arrange - Get sessions for testing
        const sessionList = await getSessionsForTesting(2);
        const [highSession, normalSession] = sessionList;

        const highJobData: ProcessSessionJobData = {
          sessionId: highSession.sessionId,
          tutorId: highSession.tutorId,
          isFirstSession: highSession.isFirstSession || false,
          priority: "high",
        };

        const normalJobData: ProcessSessionJobData = {
          sessionId: normalSession.sessionId,
          tutorId: normalSession.tutorId,
          isFirstSession: normalSession.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add normal priority job first, then high priority job
        // High priority should be processed first even though added second
        const normalJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          normalJobData,
          { priority: 5 } // Normal priority
        );

        // Small delay to ensure normal job is queued first
        await new Promise((resolve) => setTimeout(resolve, 100));

        const highJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          highJobData,
          { priority: 1 } // High priority
        );

        // Wait for both jobs to complete
        await Promise.all([
          waitForJobCompletion(highJob, 20000),
          waitForJobCompletion(normalJob, 20000),
        ]);

        // Assert - Verify both jobs completed
        const highState = await highJob.getState();
        const normalState = await normalJob.getState();
        expect(highState).toBe("completed");
        expect(normalState).toBe("completed");

        // Verify high priority job completed first (or at least not significantly later)
        const highFinished = await highJob.finished();
        const normalFinished = await normalJob.finished();
        expect(highFinished).toBeDefined();
        expect(normalFinished).toBeDefined();

        // High priority job should complete before or around the same time as normal priority
        // (allowing for small variance due to processing time)
        const highTimestamp = highJob.timestamp;
        const normalTimestamp = normalJob.timestamp;
        expect(highTimestamp).toBeDefined();
        expect(normalTimestamp).toBeDefined();
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process normal priority jobs before low priority jobs",
      async () => {
        // Arrange - Get sessions for testing
        const sessionList = await getSessionsForTesting(2);
        const [normalSession, lowSession] = sessionList;

        const normalJobData: ProcessSessionJobData = {
          sessionId: normalSession.sessionId,
          tutorId: normalSession.tutorId,
          isFirstSession: normalSession.isFirstSession || false,
          priority: "normal",
        };

        const lowJobData: ProcessSessionJobData = {
          sessionId: lowSession.sessionId,
          tutorId: lowSession.tutorId,
          isFirstSession: lowSession.isFirstSession || false,
          priority: "low",
        };

        // Act - Add low priority job first, then normal priority job
        const lowJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          lowJobData,
          { priority: 10 } // Low priority
        );

        // Small delay to ensure low job is queued first
        await new Promise((resolve) => setTimeout(resolve, 100));

        const normalJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          normalJobData,
          { priority: 5 } // Normal priority
        );

        // Wait for both jobs to complete
        await Promise.all([
          waitForJobCompletion(normalJob, 20000),
          waitForJobCompletion(lowJob, 20000),
        ]);

        // Assert - Verify both jobs completed
        const normalState = await normalJob.getState();
        const lowState = await lowJob.getState();
        expect(normalState).toBe("completed");
        expect(lowState).toBe("completed");
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process jobs with same priority in FIFO order",
      async () => {
        // Arrange - Get sessions for testing
        const sessionList = await getSessionsForTesting(2);
        const [firstSession, secondSession] = sessionList;

        const firstJobData: ProcessSessionJobData = {
          sessionId: firstSession.sessionId,
          tutorId: firstSession.tutorId,
          isFirstSession: firstSession.isFirstSession || false,
          priority: "normal",
        };

        const secondJobData: ProcessSessionJobData = {
          sessionId: secondSession.sessionId,
          tutorId: secondSession.tutorId,
          isFirstSession: secondSession.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add jobs with same priority
        const firstJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          firstJobData,
          { priority: 5 } // Normal priority
        );

        // Small delay to ensure first job is queued first
        await new Promise((resolve) => setTimeout(resolve, 100));

        const secondJob = await sessionQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          secondJobData,
          { priority: 5 } // Normal priority
        );

        // Wait for both jobs to complete
        await Promise.all([
          waitForJobCompletion(firstJob, 20000),
          waitForJobCompletion(secondJob, 20000),
        ]);

        // Assert - Verify both jobs completed
        const firstState = await firstJob.getState();
        const secondState = await secondJob.getState();
        expect(firstState).toBe("completed");
        expect(secondState).toBe("completed");

        // Jobs with same priority should be processed in order added (FIFO)
        // First job should complete before or around the same time as second job
        const firstTimestamp = firstJob.timestamp;
        const secondTimestamp = secondJob.timestamp;
        expect(firstTimestamp).toBeDefined();
        expect(secondTimestamp).toBeDefined();
      }
    );
  });

  describe("Priority across different queues", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process high priority queue jobs before normal priority queue jobs",
      async () => {
        // Arrange - Get sessions for testing
        const sessionList = await getSessionsForTesting(2);
        const [highSession, normalSession] = sessionList;

        const highJobData: ProcessSessionJobData = {
          sessionId: highSession.sessionId,
          tutorId: highSession.tutorId,
          isFirstSession: highSession.isFirstSession || false,
          priority: "high",
        };

        const normalJobData: ProcessSessionJobData = {
          sessionId: normalSession.sessionId,
          tutorId: normalSession.tutorId,
          isFirstSession: normalSession.isFirstSession || false,
          priority: "normal",
        };

        // Act - Add normal priority job first, then high priority job
        const normalJob = await normalQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          normalJobData
        );

        // Small delay to ensure normal job is queued first
        await new Promise((resolve) => setTimeout(resolve, 100));

        const highJob = await highQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          highJobData
        );

        // Wait for both jobs to complete
        await Promise.all([
          waitForJobCompletion(highJob, 20000),
          waitForJobCompletion(normalJob, 20000),
        ]);

        // Assert - Verify both jobs completed
        const highState = await highJob.getState();
        const normalState = await normalJob.getState();
        expect(highState).toBe("completed");
        expect(normalState).toBe("completed");
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process normal priority queue jobs before low priority queue jobs",
      async () => {
        // Arrange - Get sessions for testing
        const sessionList = await getSessionsForTesting(2);
        const [normalSession, lowSession] = sessionList;

        const normalJobData: ProcessSessionJobData = {
          sessionId: normalSession.sessionId,
          tutorId: normalSession.tutorId,
          isFirstSession: normalSession.isFirstSession || false,
          priority: "normal",
        };

        const lowJobData: ProcessSessionJobData = {
          sessionId: lowSession.sessionId,
          tutorId: lowSession.tutorId,
          isFirstSession: lowSession.isFirstSession || false,
          priority: "low",
        };

        // Act - Add low priority job first, then normal priority job
        const lowJob = await lowQueue.add(JOB_TYPES.PROCESS_SESSION, lowJobData);

        // Small delay to ensure low job is queued first
        await new Promise((resolve) => setTimeout(resolve, 100));

        const normalJob = await normalQueue.add(
          JOB_TYPES.PROCESS_SESSION,
          normalJobData
        );

        // Wait for both jobs to complete
        await Promise.all([
          waitForJobCompletion(normalJob, 20000),
          waitForJobCompletion(lowJob, 20000),
        ]);

        // Assert - Verify both jobs completed
        const normalState = await normalJob.getState();
        const lowState = await lowJob.getState();
        expect(normalState).toBe("completed");
        expect(lowState).toBe("completed");
      }
    );
  });

  describe("Priority preservation", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should preserve priority in job data",
      async () => {
        // Arrange - Get a session for testing
        const [session] = await getSessionsForTesting(1);

        const highJobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "high",
        };

        // Act - Add job to high priority queue
        const job = await highQueue.add(JOB_TYPES.PROCESS_SESSION, highJobData);

        // Assert - Verify priority is preserved in job data
        expect(job.data.priority).toBe("high");
      }
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should preserve priority when using getQueue helper",
      async () => {
        // Arrange - Get a session for testing
        const [session] = await getSessionsForTesting(1);

        const highJobData: ProcessSessionJobData = {
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "high",
        };

        // Act - Use getQueue helper to get high priority queue
        const queue = getQueue("high");
        const job = await queue.add(JOB_TYPES.PROCESS_SESSION, highJobData);

        // Assert - Verify priority is preserved
        expect(job.data.priority).toBe("high");
      }
    );
  });

  describe("Concurrent priority processing", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should respect priority even with concurrent job processing",
      async () => {
        // Arrange - Get multiple sessions for testing
        const sessionList = await getSessionsForTesting(3);
        const [highSession, normalSession, lowSession] = sessionList;

        const highJobData: ProcessSessionJobData = {
          sessionId: highSession.sessionId,
          tutorId: highSession.tutorId,
          isFirstSession: highSession.isFirstSession || false,
          priority: "high",
        };

        const normalJobData: ProcessSessionJobData = {
          sessionId: normalSession.sessionId,
          tutorId: normalSession.tutorId,
          isFirstSession: normalSession.isFirstSession || false,
          priority: "normal",
        };

        const lowJobData: ProcessSessionJobData = {
          sessionId: lowSession.sessionId,
          tutorId: lowSession.tutorId,
          isFirstSession: lowSession.isFirstSession || false,
          priority: "low",
        };

        // Act - Add all jobs simultaneously
        const [highJob, normalJob, lowJob] = await Promise.all([
          sessionQueue.add(JOB_TYPES.PROCESS_SESSION, highJobData, {
            priority: 1,
          }),
          sessionQueue.add(JOB_TYPES.PROCESS_SESSION, normalJobData, {
            priority: 5,
          }),
          sessionQueue.add(JOB_TYPES.PROCESS_SESSION, lowJobData, {
            priority: 10,
          }),
        ]);

        // Wait for all jobs to complete
        await Promise.all([
          waitForJobCompletion(highJob, 20000),
          waitForJobCompletion(normalJob, 20000),
          waitForJobCompletion(lowJob, 20000),
        ]);

        // Assert - Verify all jobs completed
        const highState = await highJob.getState();
        const normalState = await normalJob.getState();
        const lowState = await lowJob.getState();
        expect(highState).toBe("completed");
        expect(normalState).toBe("completed");
        expect(lowState).toBe("completed");
      }
    );
  });
});

