import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { flags } from "../db/schema";

/**
 * Flag Type Interfaces
 * 
 * Represents coaching alerts and flags for tutors.
 * Matches the flags table schema.
 * 
 * Used for:
 * - Dashboard display
 * - Flag generation (rules engine)
 * - API responses
 * - Coach workflow
 */

// Infer types from Drizzle schema
export type Flag = InferSelectModel<typeof flags>;
export type FlagInsert = InferInsertModel<typeof flags>;

/**
 * Flag type enum values
 */
export type FlagType =
  | "no_show"
  | "chronic_lateness"
  | "poor_first_session"
  | "high_reschedule_rate"
  | "early_end"
  | "low_ratings"
  | "other";

/**
 * Flag severity enum values
 */
export type FlagSeverity = "low" | "medium" | "high" | "critical";

/**
 * Flag status enum values
 */
export type FlagStatus = "open" | "in_progress" | "resolved" | "dismissed";

/**
 * Supporting data structure for flags
 */
export interface FlagSupportingData {
  sessions?: Array<{
    sessionId: string;
    date: string;
    reason?: string;
  }>;
  metrics?: {
    [key: string]: number | string;
  };
  trend?: "improving" | "stable" | "declining";
}

