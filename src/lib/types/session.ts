import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sessions } from "../db/schema";

/**
 * SessionData Interface
 * 
 * Represents a tutoring session as stored in the database.
 * Matches the sessions table schema.
 * 
 * Used for:
 * - Webhook payload validation
 * - Rules engine processing
 * - Dashboard display
 * - API responses
 */

// Infer types from Drizzle schema
export type Session = InferSelectModel<typeof sessions>;
export type SessionInsert = InferInsertModel<typeof sessions>;

// Alias for compatibility with existing code references
export type SessionData = Session;

/**
 * Helper type for session with optional computed fields
 */
export interface SessionWithComputed extends Session {
  // Computed fields that might be added at runtime
  isNoShow?: boolean;
  isLate?: boolean;
  latenessMinutes?: number;
  endedEarly?: boolean;
  earlyEndMinutes?: number;
}

/**
 * Flag type enum values (for type safety)
 */
export type RescheduledBy = "tutor" | "student" | "system" | null;

