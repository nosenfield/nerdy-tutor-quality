/**
 * Job Type Definitions
 * 
 * Defines job types and their data interfaces for type safety.
 */

/**
 * Process Session Job
 * 
 * Main job type for processing a single session.
 * Triggers rules engine evaluation and flag creation.
 */
export interface ProcessSessionJobData {
  sessionId: string;
  tutorId: string;
  isFirstSession: boolean;
  priority?: "high" | "normal" | "low";
}

/**
 * Calculate Tutor Score Job
 * 
 * Job type for aggregating tutor statistics.
 * Updates tutor_scores table with latest metrics.
 */
export interface CalculateTutorScoreJobData {
  tutorId: string;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * Send Alert Job
 * 
 * Job type for sending notifications (email/Slack).
 * Used for critical flags that need immediate attention.
 */
export interface SendAlertJobData {
  flagId: string;
  tutorId: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  channels?: Array<"email" | "slack">;
}

/**
 * Daily Analysis Job
 * 
 * Job type for overnight batch processing.
 * Calculates trends, predictions, and analytics.
 */
export interface DailyAnalysisJobData {
  date: Date;
  analysisType: "trends" | "predictions" | "analytics";
}

/**
 * Job type names
 */
export const JOB_TYPES = {
  PROCESS_SESSION: "process-session",
  CALCULATE_TUTOR_SCORE: "calculate-tutor-score",
  SEND_ALERT: "send-alert",
  DAILY_ANALYSIS: "daily-analysis",
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

