/**
 * Scoring Thresholds
 * 
 * Configurable thresholds for scoring and flag generation.
 * 
 * These thresholds can be adjusted based on:
 * - Business requirements
 * - Historical data analysis
 * - A/B testing results
 * - Coach feedback
 * 
 * @module scoring/thresholds
 */

/**
 * Scoring thresholds for flag generation
 */
export interface ScoringThresholds {
  /**
   * Lateness threshold in minutes
   * Sessions starting more than this many minutes late trigger flags
   */
  latenessThresholdMinutes: number;

  /**
   * Early-end threshold in minutes
   * Sessions ending more than this many minutes early trigger flags
   */
  earlyEndThresholdMinutes: number;

  /**
   * Poor first session rating threshold
   * First sessions with rating <= this trigger flags
   */
  poorFirstSessionRatingThreshold: number;

  /**
   * High reschedule rate threshold (as decimal, 0.0 to 1.0)
   * Tutors with reschedule rate > this trigger flags
   */
  highRescheduleRateThreshold: number;

  /**
   * Chronic lateness rate threshold (as decimal, 0.0 to 1.0)
   * Tutors with late rate > this trigger flags
   */
  chronicLatenessRateThreshold: number;

  /**
   * Time window in days for aggregate statistics
   */
  aggregateWindowDays: number;

  /**
   * Minimum sessions required for aggregate rules
   * Rules won't trigger if tutor has fewer sessions
   */
  minSessionsForAggregateRules: number;
}

/**
 * Default scoring thresholds
 * 
 * Based on industry benchmarks and initial requirements.
 */
export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholds = {
  latenessThresholdMinutes: 5,
  earlyEndThresholdMinutes: 10,
  poorFirstSessionRatingThreshold: 2,
  highRescheduleRateThreshold: 0.15, // 15%
  chronicLatenessRateThreshold: 0.30, // 30%
  aggregateWindowDays: 30,
  minSessionsForAggregateRules: 5,
};

/**
 * Score thresholds for tutor quality tiers
 */
export interface ScoreTierThresholds {
  /**
   * Excellent tier threshold
   * Tutors with scores >= this are considered excellent
   */
  excellent: number;

  /**
   * Good tier threshold
   * Tutors with scores >= this are considered good
   */
  good: number;

  /**
   * Average tier threshold
   * Tutors with scores >= this are considered average
   */
  average: number;

  /**
   * Below average threshold
   * Tutors with scores < this need attention
   */
  belowAverage: number;
}

/**
 * Default score tier thresholds
 */
export const DEFAULT_SCORE_TIER_THRESHOLDS: ScoreTierThresholds = {
  excellent: 85, // 85-100: Excellent
  good: 70, // 70-84: Good
  average: 50, // 50-69: Average
  belowAverage: 50, // 0-49: Below Average
};

/**
 * Determine tutor quality tier based on score
 * 
 * @param score - Overall tutor score (0-100)
 * @param thresholds - Score tier thresholds (defaults to DEFAULT_SCORE_TIER_THRESHOLDS)
 * @returns Quality tier string
 */
export function getTutorQualityTier(
  score: number,
  thresholds: ScoreTierThresholds = DEFAULT_SCORE_TIER_THRESHOLDS
): "excellent" | "good" | "average" | "below_average" {
  if (score >= thresholds.excellent) {
    return "excellent";
  }
  if (score >= thresholds.good) {
    return "good";
  }
  if (score >= thresholds.average) {
    return "average";
  }
  return "below_average";
}

