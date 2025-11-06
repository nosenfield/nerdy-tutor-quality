/**
 * Scoring Aggregator
 * 
 * Combines behavioral signals from rules engine into composite scores.
 * 
 * This module calculates:
 * - Attendance score (0-100) - Based on no-shows and lateness
 * - Ratings score (0-100) - Based on average student ratings
 * - Completion score (0-100) - Based on early-end sessions
 * - Reliability score (0-100) - Based on reschedule rate
 * - Overall score (0-100) - Weighted average of component scores
 * - Confidence score (0-1) - Bayesian average for new tutors
 * 
 * @module scoring/aggregator
 */

import type { TutorStats } from "./rules-engine";
import type { ScoreBreakdown } from "../types/tutor";
import { average } from "../utils/stats";

/**
 * Score weights for overall score calculation
 */
export interface ScoreWeights {
  attendance: number; // Weight for attendance score
  ratings: number; // Weight for ratings score
  completion: number; // Weight for completion score
  reliability: number; // Weight for reliability score
}

/**
 * Default score weights
 * 
 * Attendance and ratings are weighted more heavily as they directly impact
 * student experience and retention.
 */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  attendance: 0.35, // 35% - Critical for student experience
  ratings: 0.35, // 35% - Direct measure of quality
  completion: 0.15, // 15% - Important but less critical
  reliability: 0.15, // 15% - Important but less critical
};

/**
 * Calculate Attendance Score (0-100)
 * 
 * Based on no-show rate and lateness rate.
 * Perfect score (100) = 0% no-shows, 0% lateness
 * 
 * @param tutorStats - Tutor statistics
 * @returns Attendance score (0-100)
 */
export function calculateAttendanceScore(tutorStats: TutorStats): number {
  const noShowRate = tutorStats.noShowRate ?? 0;
  const lateRate = tutorStats.lateRate ?? 0;

  // No-shows are penalized more heavily than lateness
  // Each no-show reduces score by 20 points, each late session by 5 points
  const noShowPenalty = noShowRate * 20; // Max 20 points penalty
  const latePenalty = lateRate * 5; // Max 5 points penalty

  // Start with perfect score and subtract penalties
  const score = 100 - noShowPenalty - latePenalty;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate Ratings Score (0-100)
 * 
 * Based on average student rating.
 * Perfect score (100) = 5.0 average rating
 * 
 * @param tutorStats - Tutor statistics
 * @returns Ratings score (0-100)
 */
export function calculateRatingsScore(tutorStats: TutorStats): number {
  const avgRating = tutorStats.avgStudentRating;

  if (avgRating === null) {
    // No ratings yet - return neutral score
    return 50;
  }

  // Convert 1-5 rating scale to 0-100 score
  // 5.0 = 100, 4.0 = 75, 3.0 = 50, 2.0 = 25, 1.0 = 0
  const score = ((avgRating - 1) / 4) * 100;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate Completion Score (0-100)
 * 
 * Based on early-end rate.
 * Perfect score (100) = 0% early-end sessions
 * 
 * @param tutorStats - Tutor statistics
 * @returns Completion score (0-100)
 */
export function calculateCompletionScore(tutorStats: TutorStats): number {
  const earlyEndRate = tutorStats.earlyEndRate ?? 0;

  // Each early-end session reduces score by 10 points
  const penalty = earlyEndRate * 10; // Max 10 points penalty

  // Start with perfect score and subtract penalty
  const score = 100 - penalty;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate Reliability Score (0-100)
 * 
 * Based on reschedule rate.
 * Perfect score (100) = 0% reschedule rate
 * 
 * @param tutorStats - Tutor statistics
 * @returns Reliability score (0-100)
 */
export function calculateReliabilityScore(tutorStats: TutorStats): number {
  const rescheduleRate = tutorStats.rescheduleRate ?? 0;

  // Each reschedule reduces score by 5 points
  // Tutor-initiated reschedules are penalized more (handled separately if needed)
  const penalty = rescheduleRate * 5; // Max 5 points penalty

  // Start with perfect score and subtract penalty
  const score = 100 - penalty;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate Overall Score (0-100)
 * 
 * Weighted average of component scores:
 * - Attendance score (weighted)
 * - Ratings score (weighted)
 * - Completion score (weighted)
 * - Reliability score (weighted)
 * 
 * @param breakdown - Score breakdown with component scores
 * @param weights - Score weights (defaults to DEFAULT_SCORE_WEIGHTS)
 * @returns Overall score (0-100)
 */
export function calculateOverallScore(
  breakdown: ScoreBreakdown,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): number {
  const weightedSum =
    breakdown.attendance * weights.attendance +
    breakdown.ratings * weights.ratings +
    breakdown.completion * weights.completion +
    breakdown.reliability * weights.reliability;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(weightedSum)));
}

/**
 * Calculate Confidence Score (0-1)
 * 
 * Bayesian average for new tutors with few sessions.
 * Confidence increases with more sessions.
 * 
 * Formula: confidence = min(1.0, totalSessions / 30)
 * - 0 sessions = 0.0 confidence
 * - 30+ sessions = 1.0 confidence
 * 
 * @param totalSessions - Total number of sessions
 * @returns Confidence score (0.0 to 1.0)
 */
export function calculateConfidenceScore(totalSessions: number): number {
  // Confidence increases linearly up to 30 sessions
  const confidence = Math.min(1.0, totalSessions / 30);

  return Math.max(0.0, Math.min(1.0, confidence));
}

/**
 * Calculate all scores for a tutor
 * 
 * Combines all scoring functions to produce a complete score breakdown
 * and overall score for a tutor.
 * 
 * @param tutorStats - Tutor statistics
 * @param weights - Score weights (defaults to DEFAULT_SCORE_WEIGHTS)
 * @returns Object with breakdown and overall score
 */
export function calculateAllScores(
  tutorStats: TutorStats,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): {
  breakdown: ScoreBreakdown;
  overallScore: number;
  confidenceScore: number;
} {
  const breakdown: ScoreBreakdown = {
    attendance: calculateAttendanceScore(tutorStats),
    ratings: calculateRatingsScore(tutorStats),
    completion: calculateCompletionScore(tutorStats),
    reliability: calculateReliabilityScore(tutorStats),
  };

  const overallScore = calculateOverallScore(breakdown, weights);
  const confidenceScore = calculateConfidenceScore(tutorStats.totalSessions);

  return {
    breakdown,
    overallScore,
    confidenceScore,
  };
}

