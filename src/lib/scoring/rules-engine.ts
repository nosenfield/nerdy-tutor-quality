/**
 * Rules Engine (Tier 1)
 * 
 * Fast, rules-based quality scoring for tutor sessions.
 * 
 * This module provides the foundation for behavioral signal detection:
 * - No-show detection
 * - Lateness detection
 * - Early-end detection
 * - Poor first session detection
 * - High reschedule rate detection
 * - Chronic lateness detection
 * - Declining rating trend detection
 * 
 * Rules can operate on:
 * - Single sessions (session-level rules)
 * - Aggregated tutor statistics (aggregate-level rules)
 * 
 * Architecture:
 * - Rules are pure functions that evaluate conditions
 * - Rules return RuleResult objects indicating if a flag should be created
 * - Rules engine orchestrates rule evaluation and flag generation
 * - Thresholds are configurable via RulesEngineConfig
 * 
 * @module scoring/rules-engine
 */

import type { Session } from "../types/session";
import type { FlagType, FlagSeverity, FlagSupportingData } from "../types/flag";
import type { TutorScore } from "../types/tutor";

/**
 * Result of evaluating a single rule
 * 
 * Indicates whether a flag should be created and provides
 * metadata about the rule evaluation.
 */
export interface RuleResult {
  /**
   * Whether this rule triggered (should create a flag)
   */
  triggered: boolean;

  /**
   * Type of flag to create (if triggered)
   */
  flagType: FlagType;

  /**
   * Severity of the flag (if triggered)
   */
  severity: FlagSeverity;

  /**
   * Human-readable title for the flag
   */
  title: string;

  /**
   * Detailed description of why the flag was triggered
   */
  description: string;

  /**
   * Recommended action for coaches
   */
  recommendedAction?: string;

  /**
   * Supporting data for the flag (sessions, metrics, trends)
   */
  supportingData?: FlagSupportingData;

  /**
   * Confidence score (0.0 to 1.0) indicating how certain
   * we are this is a real issue vs. false positive
   */
  confidence?: number;
}

/**
 * Context passed to rule functions for evaluation
 * 
 * Contains all data needed for rule evaluation:
 * - Session data (for session-level rules)
 * - Tutor statistics (for aggregate-level rules)
 * - Configuration thresholds
 */
export interface RuleContext {
  /**
   * Session being evaluated (for session-level rules)
   * May be undefined for aggregate-level rules
   */
  session?: Session;

  /**
   * Tutor statistics aggregated over time windows
   * Used for aggregate-level rules (reschedule rate, chronic lateness, etc.)
   */
  tutorStats?: TutorStats;

  /**
   * Configuration thresholds and parameters
   */
  config: RulesEngineConfig;
}

/**
 * Aggregated tutor statistics over time windows
 * 
 * Used by aggregate-level rules to evaluate patterns
 * across multiple sessions.
 */
export interface TutorStats {
  /**
   * Tutor ID
   */
  tutorId: string;

  /**
   * Time window start (e.g., 30 days ago)
   */
  windowStart: Date;

  /**
   * Time window end (e.g., today)
   */
  windowEnd: Date;

  /**
   * Total sessions in window
   */
  totalSessions: number;

  /**
   * First sessions in window
   */
  firstSessions: number;

  /**
   * No-show count and rate
   */
  noShowCount: number;
  noShowRate: number | null;

  /**
   * Late sessions count, rate, and average lateness
   */
  lateCount: number;
  lateRate: number | null;
  avgLatenessMinutes: number | null;

  /**
   * Early-end sessions count, rate, and average early minutes
   */
  earlyEndCount: number;
  earlyEndRate: number | null;
  avgEarlyEndMinutes: number | null;

  /**
   * Reschedule count, rate, and tutor-initiated count
   */
  rescheduleCount: number;
  rescheduleRate: number | null;
  tutorInitiatedReschedules: number;

  /**
   * Average student rating
   */
  avgStudentRating: number | null;

  /**
   * Average first session rating
   */
  avgFirstSessionRating: number | null;

  /**
   * Rating trend (improving, stable, declining)
   */
  ratingTrend: "improving" | "stable" | "declining" | null;

  /**
   * Recent sessions for detailed analysis
   * (e.g., last 10 sessions for flag supporting data)
   */
  recentSessions?: Session[];
}

/**
 * Rule function type
 * 
 * A rule is a pure function that evaluates a condition
 * and returns a RuleResult indicating if a flag should be created.
 * 
 * Rules should be:
 * - Pure (no side effects)
 * - Fast (evaluate in < 10ms)
 * - Deterministic (same input = same output)
 * 
 * @param context - Rule evaluation context
 * @returns RuleResult indicating if flag should be created
 */
export type RuleFunction = (context: RuleContext) => RuleResult;

/**
 * Configuration for the rules engine
 * 
 * Contains thresholds and parameters used by rules
 * to determine when flags should be created.
 */
export interface RulesEngineConfig {
  /**
   * Lateness threshold in minutes
   * Sessions starting more than this many minutes late trigger flags
   * Default: 5 minutes
   */
  latenessThresholdMinutes: number;

  /**
   * Early-end threshold in minutes
   * Sessions ending more than this many minutes early trigger flags
   * Default: 10 minutes
   */
  earlyEndThresholdMinutes: number;

  /**
   * Poor first session rating threshold
   * First sessions with rating <= this trigger flags
   * Default: 2 (out of 5)
   */
  poorFirstSessionRatingThreshold: number;

  /**
   * High reschedule rate threshold (as decimal, 0.0 to 1.0)
   * Tutors with reschedule rate > this trigger flags
   * Default: 0.15 (15%)
   */
  highRescheduleRateThreshold: number;

  /**
   * Chronic lateness rate threshold (as decimal, 0.0 to 1.0)
   * Tutors with late rate > this trigger flags
   * Default: 0.30 (30%)
   */
  chronicLatenessRateThreshold: number;

  /**
   * Time window in days for aggregate statistics
   * Default: 30 days
   */
  aggregateWindowDays: number;

  /**
   * Minimum sessions required for aggregate rules
   * Rules won't trigger if tutor has fewer sessions
   * Default: 5 sessions
   */
  minSessionsForAggregateRules: number;
}

/**
 * Default configuration for rules engine
 * 
 * These values are based on industry benchmarks and
 * can be overridden per-instance.
 */
export const DEFAULT_RULES_ENGINE_CONFIG: RulesEngineConfig = {
  latenessThresholdMinutes: 5,
  earlyEndThresholdMinutes: 10,
  poorFirstSessionRatingThreshold: 2,
  highRescheduleRateThreshold: 0.15, // 15%
  chronicLatenessRateThreshold: 0.30, // 30%
  aggregateWindowDays: 30,
  minSessionsForAggregateRules: 5,
};

/**
 * Helper function to create a RuleResult for a triggered rule
 * 
 * @param flagType - Type of flag
 * @param severity - Severity level
 * @param title - Flag title
 * @param description - Flag description
 * @param options - Optional fields (recommendedAction, supportingData, confidence)
 * @returns RuleResult object
 */
export function createRuleResult(
  flagType: FlagType,
  severity: FlagSeverity,
  title: string,
  description: string,
  options?: {
    recommendedAction?: string;
    supportingData?: FlagSupportingData;
    confidence?: number;
  }
): RuleResult {
  return {
    triggered: true,
    flagType,
    severity,
    title,
    description,
    recommendedAction: options?.recommendedAction,
    supportingData: options?.supportingData,
    confidence: options?.confidence ?? 1.0,
  };
}

/**
 * Helper function to create a RuleResult for a non-triggered rule
 * 
 * @param flagType - Type of flag (for consistency)
 * @returns RuleResult object with triggered: false
 */
export function createNoTriggerResult(flagType: FlagType): RuleResult {
  return {
    triggered: false,
    flagType,
    severity: "low", // Not used when triggered: false
    title: "",
    description: "",
  };
}

