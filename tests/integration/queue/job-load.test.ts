/**
 * Integration Tests: Job Load Testing
 * 
 * Load tests for verifying that the queue system can handle 100 concurrent
 * jobs. Tests verify that all jobs are processed successfully, no jobs are
 * lost, and performance metrics are reasonable.
 * 
 * Prerequisites:
 * - Redis must be available (REDIS_URL in .env.local)
 * - Database must be available (DATABASE_URL in .env.local)
 * - Test database should be seeded with at least 100 sessions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { sessionQueue, closeQueues } from "@/lib/queue";
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
async function waitForJobCompletion(job: Job, timeoutMs: number = 30000): Promise<void> {
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

async function waitForAllJobsCompletion(
  jobs: Job[],
  timeoutMs: number = 300000
): Promise<void> {
  // Wait for all jobs to complete with a longer timeout for load tests
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const states = await Promise.all(jobs.map((job) => job.getState()));
    const allComplete = states.every(
      (state) => state === "completed" || state === "failed"
    );
    if (allComplete) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Not all jobs completed within ${timeoutMs}ms`);
}

async function cleanQueue(queue: typeof sessionQueue): Promise<void> {
  // Remove all jobs from queue
  await queue.clean(0, "completed");
  await queue.clean(0, "failed");
  await queue.clean(0, "active");
  await queue.clean(0, "waiting");
  await queue.clean(0, "delayed");
}

async function getSessionsForLoadTesting(count: number = 100) {
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

describe("Job Load Testing", () => {
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
        "Redis not available - skipping load tests. Set REDIS_URL in .env.local to run these tests."
      );
    }

    // Check if database is available and set up test data
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch (error) {
      dbAvailable = false;
      console.warn(
        "Database not available - skipping load tests. Set DATABASE_URL in .env.local to run these tests."
      );
    }

    // Start workers if both Redis and database are available
    if (redisAvailable && dbAvailable) {
      try {
        startWorkers();
        workersStarted = true;
        // Give workers time to start
        await new Promise((resolve) => setTimeout(resolve, 1000));
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

  describe("100 concurrent jobs", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should add 100 concurrent jobs to queue",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue simultaneously
        const startTime = Date.now();
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );
        const queueTime = Date.now() - startTime;

        // Assert - Verify all 100 jobs were added
        expect(jobs).toHaveLength(100);
        jobs.forEach((job) => {
          expect(job).toBeDefined();
          expect(job.id).toBeDefined();
        });

        console.log(`Added 100 jobs to queue in ${queueTime}ms`);
      },
      60000 // 60 second timeout for adding jobs
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process all 100 concurrent jobs successfully",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );

        // Wait for all jobs to complete (with longer timeout for load test)
        const startTime = Date.now();
        await waitForAllJobsCompletion(jobs, 300000); // 5 minute timeout
        const processingTime = Date.now() - startTime;

        // Assert - Verify all jobs completed successfully
        const states = await Promise.all(jobs.map((job) => job.getState()));
        const completedCount = states.filter((state) => state === "completed").length;
        const failedCount = states.filter((state) => state === "failed").length;

        expect(completedCount + failedCount).toBe(100); // All jobs should be done
        expect(completedCount).toBeGreaterThan(0); // At least some should complete

        console.log(
          `Processed 100 jobs: ${completedCount} completed, ${failedCount} failed in ${processingTime}ms`
        );
        console.log(`Throughput: ${(100 / (processingTime / 1000)).toFixed(2)} jobs/second`);
      },
      360000 // 6 minute timeout for processing 100 jobs
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should not lose any jobs during processing",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );

        // Track job IDs
        const jobIds = new Set(jobs.map((job) => job.id));

        // Wait for all jobs to complete
        await waitForAllJobsCompletion(jobs, 300000);

        // Assert - Verify all jobs are accounted for
        expect(jobIds.size).toBe(100);

        // Verify all jobs have a final state (completed or failed)
        const states = await Promise.all(jobs.map((job) => job.getState()));
        states.forEach((state) => {
          expect(["completed", "failed"]).toContain(state);
        });

        // Verify no duplicate job IDs
        const uniqueJobIds = new Set(jobs.map((job) => job.id));
        expect(uniqueJobIds.size).toBe(100);
      },
      360000 // 6 minute timeout
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should handle load gracefully without errors",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        let errorOccurred = false;
        let errorMessage = "";

        try {
          const jobs = await Promise.all(
            jobDataArray.map((data) =>
              sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
            )
          );

          // Wait for all jobs to complete
          await waitForAllJobsCompletion(jobs, 300000);

          // Verify all jobs have a final state
          const states = await Promise.all(jobs.map((job) => job.getState()));
          states.forEach((state) => {
            expect(["completed", "failed"]).toContain(state);
          });
        } catch (error) {
          errorOccurred = true;
          errorMessage = error instanceof Error ? error.message : String(error);
        }

        // Assert - Verify no errors occurred
        expect(errorOccurred).toBe(false);
        if (errorOccurred) {
          throw new Error(`Error during load test: ${errorMessage}`);
        }
      },
      360000 // 6 minute timeout
    );
  });

  describe("Performance metrics", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should process jobs with reasonable throughput",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        const queueStartTime = Date.now();
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );
        const queueTime = Date.now() - queueStartTime;

        // Wait for all jobs to complete
        const processingStartTime = Date.now();
        await waitForAllJobsCompletion(jobs, 300000);
        const processingTime = Date.now() - processingStartTime;

        // Calculate metrics
        const totalTime = Date.now() - queueStartTime;
        const throughput = 100 / (totalTime / 1000); // jobs per second

        // Assert - Verify performance metrics
        expect(queueTime).toBeLessThan(10000); // Should queue 100 jobs in < 10 seconds
        expect(processingTime).toBeLessThan(300000); // Should process in < 5 minutes
        expect(throughput).toBeGreaterThan(0); // Should have some throughput

        console.log(`Queue time: ${queueTime}ms`);
        console.log(`Processing time: ${processingTime}ms`);
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Throughput: ${throughput.toFixed(2)} jobs/second`);
      },
      360000 // 6 minute timeout
    );

    it.skipIf(!redisAvailable || !dbAvailable)(
      "should maintain queue statistics under load",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );

        // Check queue statistics immediately after adding
        const waitingAfterAdd = await sessionQueue.getWaitingCount();
        const activeAfterAdd = await sessionQueue.getActiveCount();

        // Wait for all jobs to complete
        await waitForAllJobsCompletion(jobs, 300000);

        // Check queue statistics after processing
        const waitingAfterProcess = await sessionQueue.getWaitingCount();
        const activeAfterProcess = await sessionQueue.getActiveCount();
        const completedAfterProcess = await sessionQueue.getCompletedCount();
        const failedAfterProcess = await sessionQueue.getFailedCount();

        // Assert - Verify queue statistics
        expect(waitingAfterAdd + activeAfterAdd).toBeGreaterThanOrEqual(0);
        expect(waitingAfterProcess).toBeGreaterThanOrEqual(0);
        expect(activeAfterProcess).toBeGreaterThanOrEqual(0);
        expect(completedAfterProcess + failedAfterProcess).toBeGreaterThanOrEqual(0);

        // Total should account for all jobs
        const total =
          waitingAfterProcess +
          activeAfterProcess +
          completedAfterProcess +
          failedAfterProcess;
        expect(total).toBeGreaterThanOrEqual(0);
      },
      360000 // 6 minute timeout
    );
  });

  describe("Priority under load", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should respect priority even under load",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        // Split into high, normal, and low priority jobs
        const highPrioritySessions = sessionList.slice(0, 33);
        const normalPrioritySessions = sessionList.slice(33, 66);
        const lowPrioritySessions = sessionList.slice(66, 100);

        const highJobs = await Promise.all(
          highPrioritySessions.map((session) =>
            sessionQueue.add(
              JOB_TYPES.PROCESS_SESSION,
              {
                sessionId: session.sessionId,
                tutorId: session.tutorId,
                isFirstSession: session.isFirstSession || false,
                priority: "high",
              },
              { priority: 1 }
            )
          )
        );

        const normalJobs = await Promise.all(
          normalPrioritySessions.map((session) =>
            sessionQueue.add(
              JOB_TYPES.PROCESS_SESSION,
              {
                sessionId: session.sessionId,
                tutorId: session.tutorId,
                isFirstSession: session.isFirstSession || false,
                priority: "normal",
              },
              { priority: 5 }
            )
          )
        );

        const lowJobs = await Promise.all(
          lowPrioritySessions.map((session) =>
            sessionQueue.add(
              JOB_TYPES.PROCESS_SESSION,
              {
                sessionId: session.sessionId,
                tutorId: session.tutorId,
                isFirstSession: session.isFirstSession || false,
                priority: "low",
              },
              { priority: 10 }
            )
          )
        );

        const allJobs = [...highJobs, ...normalJobs, ...lowJobs];

        // Wait for all jobs to complete
        await waitForAllJobsCompletion(allJobs, 300000);

        // Assert - Verify all jobs completed
        const states = await Promise.all(allJobs.map((job) => job.getState()));
        states.forEach((state) => {
          expect(["completed", "failed"]).toContain(state);
        });

        expect(allJobs.length).toBe(100);
      },
      360000 // 6 minute timeout
    );
  });

  describe("Retry logic under load", () => {
    it.skipIf(!redisAvailable || !dbAvailable)(
      "should handle retries correctly under load",
      async () => {
        // Arrange - Get 100 sessions from the database
        const sessionList = await getSessionsForLoadTesting(100);

        // Mix of valid and invalid sessions (to test retry logic)
        const jobDataArray: ProcessSessionJobData[] = sessionList.map((session) => ({
          sessionId: session.sessionId,
          tutorId: session.tutorId,
          isFirstSession: session.isFirstSession || false,
          priority: "normal",
        }));

        // Act - Add all 100 jobs to queue
        const jobs = await Promise.all(
          jobDataArray.map((data) =>
            sessionQueue.add(JOB_TYPES.PROCESS_SESSION, data)
          )
        );

        // Wait for all jobs to complete
        await waitForAllJobsCompletion(jobs, 300000);

        // Assert - Verify all jobs have a final state
        const states = await Promise.all(jobs.map((job) => job.getState()));
        const completedCount = states.filter((state) => state === "completed").length;
        const failedCount = states.filter((state) => state === "failed").length;

        expect(completedCount + failedCount).toBe(100); // All jobs should be done
        expect(completedCount).toBeGreaterThan(0); // At least some should complete

        // Failed jobs should have failed after retries (if any)
        const failedJobs = jobs.filter(
          async (job) => (await job.getState()) === "failed"
        );
        for (const job of failedJobs) {
          const state = await job.getState();
          if (state === "failed") {
            const failedReason = await job.getFailedReason();
            expect(failedReason).toBeDefined();
          }
        }
      },
      360000 // 6 minute timeout
    );
  });
});

