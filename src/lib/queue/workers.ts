/**
 * Worker Implementations
 * 
 * Bull queue workers that process jobs.
 * Handles job processing, error handling, and logging.
 */

import type { Job } from "bull";
import { sessionQueue, getQueue } from "./index";
import type {
  ProcessSessionJobData,
  CalculateTutorScoreJobData,
  SendAlertJobData,
} from "./jobs";
import { processSession } from "./process-session";

/**
 * Process Session Worker
 * 
 * Processes a single session through the rules engine and creates flags.
 */
export async function processSessionWorker(
  job: Job<ProcessSessionJobData>
): Promise<string[]> {
  const { sessionId, tutorId, isFirstSession } = job.data;

  console.log(
    `Processing session ${sessionId} for tutor ${tutorId} (first session: ${isFirstSession})`
  );

  try {
    // Process session through rules engine
    const flagIds = await processSession(sessionId);

    console.log(
      `Successfully processed session ${sessionId}: created ${flagIds.length} flags`
    );

    return flagIds;
  } catch (error) {
    console.error(`Error processing session ${sessionId}:`, error);
    throw error; // Re-throw to trigger retry logic
  }
}

/**
 * Calculate Tutor Score Worker
 * 
 * Aggregates tutor statistics and updates tutor_scores table.
 * (Future implementation - not yet implemented)
 */
export async function calculateTutorScoreWorker(
  job: Job<CalculateTutorScoreJobData>
): Promise<void> {
  const { tutorId, windowStart, windowEnd } = job.data;

  console.log(
    `Calculating tutor score for ${tutorId} (${windowStart.toISOString()} to ${windowEnd.toISOString()})`
  );

  // TODO: Implement tutor score calculation
  // This will update the tutor_scores table with aggregated metrics
  throw new Error("Not yet implemented");
}

/**
 * Send Alert Worker
 * 
 * Sends notifications (email/Slack) for critical flags.
 * (Future implementation - not yet implemented)
 */
export async function sendAlertWorker(job: Job<SendAlertJobData>): Promise<void> {
  const { flagId, tutorId, severity, message, channels } = job.data;

  console.log(
    `Sending alert for flag ${flagId} (tutor ${tutorId}, severity: ${severity})`
  );

  // TODO: Implement alert sending
  // This will send email/Slack notifications for critical flags
  throw new Error("Not yet implemented");
}

/**
 * Register all workers
 * 
 * Sets up job processors for all job types.
 */
export function registerWorkers(): void {
  // Register process-session worker
  sessionQueue.process("process-session", async (job: Job<ProcessSessionJobData>) => {
    return await processSessionWorker(job);
  });

  // Register calculate-tutor-score worker (future)
  // sessionQueue.process("calculate-tutor-score", async (job: Job<CalculateTutorScoreJobData>) => {
  //   return await calculateTutorScoreWorker(job);
  // });

  // Register send-alert worker (future)
  // sessionQueue.process("send-alert", async (job: Job<SendAlertJobData>) => {
  //   return await sendAlertWorker(job);
  // });

  console.log("Workers registered successfully");
}

/**
 * Start workers
 * 
 * Registers all workers and starts processing jobs.
 */
export function startWorkers(): void {
  registerWorkers();
  console.log("Workers started and ready to process jobs");
}

