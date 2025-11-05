import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { tutorScores } from "../db/schema";

/**
 * Tutor Type Interfaces
 * 
 * Represents tutor performance data and scores.
 * Matches the tutor_scores table schema.
 * 
 * Used for:
 * - Dashboard display
 * - Scoring calculations
 * - API responses
 */

// Infer types from Drizzle schema
export type TutorScore = InferSelectModel<typeof tutorScores>;
export type TutorScoreInsert = InferInsertModel<typeof tutorScores>;

/**
 * Rating trend enum values
 */
export type RatingTrend = "improving" | "stable" | "declining" | null;

/**
 * Tutor with current score and metadata
 */
export interface Tutor {
  tutorId: string;
  currentScore: TutorScore | null;
  sessionCount: number;
  firstSessionCount: number;
  hasActiveFlags: boolean;
}

/**
 * Score breakdown for display
 */
export interface ScoreBreakdown {
  attendance: number; // 0-100
  ratings: number; // 0-100
  completion: number; // 0-100
  reliability: number; // 0-100
}

/**
 * Tutor score response with breakdown
 */
export interface TutorScoreResponse {
  score: TutorScore;
  breakdown: ScoreBreakdown;
}

