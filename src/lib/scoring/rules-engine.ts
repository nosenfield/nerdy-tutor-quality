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
import { calculateLateness } from "../utils/time";

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

/**
 * No-show Detection Rule
 * 
 * Detects when a tutor fails to join a scheduled session.
 * A no-show is defined as tutor_join_time === null.
 * 
 * This is a session-level rule that evaluates individual sessions.
 * 
 * @param context - Rule evaluation context (must include session)
 * @returns RuleResult indicating if no-show flag should be created
 */
export function detectNoShow(context: RuleContext): RuleResult {
  const { session } = context;

  // Session-level rule requires session data
  if (!session) {
    return createNoTriggerResult("no_show");
  }

  // Check if tutor failed to join (tutor_join_time is null)
  const isNoShow = session.tutorJoinTime === null;

  if (!isNoShow) {
    return createNoTriggerResult("no_show");
  }

  // Determine severity: critical for no-shows (high impact on student experience)
  const severity: FlagSeverity = "critical";

  // Format session date for description
  const sessionDate = new Date(session.sessionStartTime).toLocaleDateString();

  return createRuleResult(
    "no_show",
    severity,
    `Tutor no-show on ${sessionDate}`,
    `Tutor ${session.tutorId} did not join the scheduled session on ${sessionDate}. This impacts student experience and may indicate reliability issues.`,
    {
      recommendedAction: "Contact tutor to understand reason for no-show. Review tutor's attendance history and consider coaching if this is a pattern.",
      supportingData: {
        sessions: [
          {
            sessionId: session.sessionId,
            date: session.sessionStartTime.toISOString(),
            reason: "Tutor did not join session",
          },
        ],
        metrics: {
          scheduledStartTime: session.sessionStartTime.toISOString(),
          studentId: session.studentId,
        },
      },
      confidence: 1.0, // Very high confidence - no-show is unambiguous
    }
  );
}

/**
 * Lateness Detection Rule
 * 
 * Detects when a tutor joins a session more than the configured threshold minutes late.
 * Default threshold is 5 minutes (configurable via RulesEngineConfig).
 * 
 * This is a session-level rule that evaluates individual sessions.
 * 
 * @param context - Rule evaluation context (must include session)
 * @returns RuleResult indicating if lateness flag should be created
 */
export function detectLateness(context: RuleContext): RuleResult {
  const { session, config } = context;

  // Session-level rule requires session data
  if (!session) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Skip if tutor didn't join (handled by no-show rule)
  if (session.tutorJoinTime === null) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Calculate lateness in minutes
  const latenessMinutes = calculateLateness(
    session.sessionStartTime,
    session.tutorJoinTime
  );

  // Check if lateness exceeds threshold
  if (latenessMinutes === null || latenessMinutes < config.latenessThresholdMinutes) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Determine severity based on lateness amount
  let severity: FlagSeverity;
  if (latenessMinutes >= 15) {
    severity = "high"; // Very late (>15 min)
  } else if (latenessMinutes >= 10) {
    severity = "medium"; // Moderately late (10-15 min)
  } else {
    severity = "low"; // Slightly late (5-10 min)
  }

  // Format session date for description
  const sessionDate = new Date(session.sessionStartTime).toLocaleDateString();

  return createRuleResult(
    "chronic_lateness",
    severity,
    `Tutor ${latenessMinutes} minutes late on ${sessionDate}`,
    `Tutor ${session.tutorId} joined the session ${latenessMinutes} minutes late on ${sessionDate}. This impacts student experience and may indicate time management issues.`,
    {
      recommendedAction: "Discuss punctuality expectations with tutor. Review their schedule management and provide coaching on time management if this is a pattern.",
      supportingData: {
        sessions: [
          {
            sessionId: session.sessionId,
            date: session.sessionStartTime.toISOString(),
            reason: `Joined ${latenessMinutes} minutes late`,
          },
        ],
        metrics: {
          scheduledStartTime: session.sessionStartTime.toISOString(),
          actualJoinTime: session.tutorJoinTime.toISOString(),
          latenessMinutes,
          thresholdMinutes: config.latenessThresholdMinutes,
        },
      },
      confidence: 0.95, // High confidence - lateness is measurable
    }
  );
}

