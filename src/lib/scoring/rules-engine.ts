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
import { endedEarly } from "../utils/time";
import { db, sessions } from "../db";
import { and, eq, gte, lte } from "drizzle-orm";
import { asc } from "drizzle-orm";
import { average, calculateRate, calculateTrend } from "../utils/stats";
import { isNoShow, isLate } from "../utils/time";

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

/**
 * Early-End Detection Rule
 * 
 * Detects when a tutor ends a session more than the configured threshold minutes early.
 * Default threshold is 10 minutes (configurable via RulesEngineConfig).
 * 
 * This is a session-level rule that evaluates individual sessions.
 * 
 * @param context - Rule evaluation context (must include session)
 * @returns RuleResult indicating if early-end flag should be created
 */
export function detectEarlyEnd(context: RuleContext): RuleResult {
  const { session, config } = context;

  // Session-level rule requires session data
  if (!session) {
    return createNoTriggerResult("early_end");
  }

  // Skip if tutor didn't join or leave (handled by other rules)
  if (session.tutorJoinTime === null || session.tutorLeaveTime === null) {
    return createNoTriggerResult("early_end");
  }

  // Check if session ended early
  const endedEarlyFlag = endedEarly(
    session.sessionEndTime,
    session.tutorLeaveTime,
    config.earlyEndThresholdMinutes
  );

  if (!endedEarlyFlag) {
    return createNoTriggerResult("early_end");
  }

  // Calculate how many minutes early
  const earlyMinutes = Math.abs(
    Math.round(
      (session.tutorLeaveTime.getTime() - session.sessionEndTime.getTime()) /
        60000
    )
  );

  // Determine severity based on how early
  let severity: FlagSeverity;
  if (earlyMinutes >= 20) {
    severity = "high"; // Very early (>20 min)
  } else if (earlyMinutes >= 15) {
    severity = "medium"; // Moderately early (15-20 min)
  } else {
    severity = "low"; // Slightly early (10-15 min)
  }

  // Format session date for description
  const sessionDate = new Date(session.sessionStartTime).toLocaleDateString();

  return createRuleResult(
    "early_end",
    severity,
    `Tutor ended session ${earlyMinutes} minutes early on ${sessionDate}`,
    `Tutor ${session.tutorId} ended the session ${earlyMinutes} minutes early on ${sessionDate}. This may indicate incomplete coverage of material or time management issues.`,
    {
      recommendedAction: "Review session content to ensure all material was covered. Discuss session completion expectations with tutor. Check if this is a pattern.",
      supportingData: {
        sessions: [
          {
            sessionId: session.sessionId,
            date: session.sessionStartTime.toISOString(),
            reason: `Ended ${earlyMinutes} minutes early`,
          },
        ],
        metrics: {
          scheduledEndTime: session.sessionEndTime.toISOString(),
          actualLeaveTime: session.tutorLeaveTime.toISOString(),
          earlyMinutes,
          thresholdMinutes: config.earlyEndThresholdMinutes,
        },
      },
      confidence: 0.95, // High confidence - early end is measurable
    }
  );
}

/**
 * Poor First Session Detection Rule
 * 
 * Detects when a tutor receives a low rating (≤ threshold) on a first session.
 * First sessions are critical for student retention (24% churn driver).
 * Default threshold is 2 stars (configurable via RulesEngineConfig).
 * 
 * This is a session-level rule that evaluates individual sessions.
 * 
 * @param context - Rule evaluation context (must include session)
 * @returns RuleResult indicating if poor first session flag should be created
 */
export function detectPoorFirstSession(context: RuleContext): RuleResult {
  const { session, config } = context;

  // Session-level rule requires session data
  if (!session) {
    return createNoTriggerResult("poor_first_session");
  }

  // Only evaluate first sessions
  if (!session.isFirstSession) {
    return createNoTriggerResult("poor_first_session");
  }

  // Check if student provided a rating
  const studentRating = session.studentFeedbackRating;
  if (studentRating === null || studentRating === undefined) {
    return createNoTriggerResult("poor_first_session");
  }

  // Check if rating is at or below threshold
  if (studentRating > config.poorFirstSessionRatingThreshold) {
    return createNoTriggerResult("poor_first_session");
  }

  // Determine severity based on rating
  let severity: FlagSeverity;
  if (studentRating === 1) {
    severity = "critical"; // Very poor (1 star)
  } else if (studentRating === 2) {
    severity = "high"; // Poor (2 stars)
  } else {
    severity = "medium"; // Below threshold but not terrible
  }

  // Format session date for description
  const sessionDate = new Date(session.sessionStartTime).toLocaleDateString();

  return createRuleResult(
    "poor_first_session",
    severity,
    `Poor first session rating (${studentRating}/5) on ${sessionDate}`,
    `Tutor ${session.tutorId} received a ${studentRating}-star rating on their first session with student ${session.studentId} on ${sessionDate}. Poor first sessions are a major churn driver (24% of students don't return).`,
    {
      recommendedAction: "Review session recording/transcript if available. Discuss first session best practices with tutor. Consider pairing tutor with a mentor for first session coaching. Follow up with student to understand concerns.",
      supportingData: {
        sessions: [
          {
            sessionId: session.sessionId,
            date: session.sessionStartTime.toISOString(),
            reason: `First session rating: ${studentRating}/5`,
          },
        ],
        metrics: {
          studentRating,
          threshold: config.poorFirstSessionRatingThreshold,
          isFirstSession: "true",
          studentId: session.studentId,
        },
      },
      confidence: 0.9, // High confidence - rating is explicit feedback
    }
  );
}

/**
 * Get Tutor Statistics
 * 
 * Aggregates session data for a tutor over a specified time window.
 * Calculates all metrics needed for aggregate-level rules:
 * - No-show count and rate
 * - Late session count, rate, and average lateness
 * - Early-end count, rate, and average early minutes
 * - Reschedule count, rate, and tutor-initiated count
 * - Average student rating and first session rating
 * - Rating trend
 * 
 * @param tutorId - Tutor ID to aggregate statistics for
 * @param windowStart - Start of time window
 * @param windowEnd - End of time window
 * @param latenessThresholdMinutes - Threshold for considering a session "late" (default: 5)
 * @param earlyEndThresholdMinutes - Threshold for considering a session "ended early" (default: 10)
 * @returns TutorStats object with aggregated metrics
 */
export async function getTutorStats(
  tutorId: string,
  windowStart: Date,
  windowEnd: Date,
  latenessThresholdMinutes: number = 5,
  earlyEndThresholdMinutes: number = 10
): Promise<TutorStats> {
  // Query sessions for tutor within time window
  const tutorSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tutorId, tutorId),
        gte(sessions.sessionStartTime, windowStart),
        lte(sessions.sessionStartTime, windowEnd)
      )
    )
    .orderBy(asc(sessions.sessionStartTime));

  const totalSessions = tutorSessions.length;
  const firstSessions = tutorSessions.filter((s) => s.isFirstSession).length;

  // Calculate no-show metrics
  const noShowSessions = tutorSessions.filter((s) =>
    isNoShow(s.tutorJoinTime)
  );
  const noShowCount = noShowSessions.length;
  const noShowRate = calculateRate(noShowCount, totalSessions);

  // Calculate lateness metrics
  const lateSessions = tutorSessions.filter((s) =>
    isLate(s.sessionStartTime, s.tutorJoinTime, latenessThresholdMinutes)
  );
  const lateCount = lateSessions.length;
  const lateRate = calculateRate(lateCount, totalSessions);

  const latenessMinutes = tutorSessions
    .map((s) => calculateLateness(s.sessionStartTime, s.tutorJoinTime))
    .filter((m): m is number => m !== null && m > 0);
  const avgLatenessMinutes =
    latenessMinutes.length > 0 ? average(latenessMinutes) : null;

  // Calculate early-end metrics
  const earlyEndSessions = tutorSessions.filter((s) =>
    endedEarly(s.sessionEndTime, s.tutorLeaveTime, earlyEndThresholdMinutes)
  );
  const earlyEndCount = earlyEndSessions.length;
  const earlyEndRate = calculateRate(earlyEndCount, totalSessions);

  const earlyEndMinutesList = tutorSessions
    .map((s) => {
      if (!s.tutorLeaveTime) return null;
      const early = Math.abs(
        Math.round(
          (s.tutorLeaveTime.getTime() - s.sessionEndTime.getTime()) / 60000
        )
      );
      return early >= earlyEndThresholdMinutes ? early : null;
    })
    .filter((m): m is number => m !== null);
  const avgEarlyEndMinutes =
    earlyEndMinutesList.length > 0 ? average(earlyEndMinutesList) : null;

  // Calculate reschedule metrics
  const rescheduledSessions = tutorSessions.filter((s) => s.wasRescheduled);
  const rescheduleCount = rescheduledSessions.length;
  const rescheduleRate = calculateRate(rescheduleCount, totalSessions);
  const tutorInitiatedReschedules = rescheduledSessions.filter(
    (s) => s.rescheduledBy === "tutor"
  ).length;

  // Calculate rating metrics
  const studentRatings = tutorSessions
    .map((s) => s.studentFeedbackRating)
    .filter((r): r is number => r !== null && r !== undefined);
  const avgStudentRating =
    studentRatings.length > 0 ? average(studentRatings) : null;

  const firstSessionRatings = tutorSessions
    .filter((s) => s.isFirstSession)
    .map((s) => s.studentFeedbackRating)
    .filter((r): r is number => r !== null && r !== undefined);
  const avgFirstSessionRating =
    firstSessionRatings.length > 0 ? average(firstSessionRatings) : null;

  // Calculate rating trend (compare recent vs older sessions)
  // Split sessions into two halves for trend calculation
  const sortedSessions = [...tutorSessions].sort(
    (a, b) => a.sessionStartTime.getTime() - b.sessionStartTime.getTime()
  );
  const midPoint = Math.floor(sortedSessions.length / 2);
  const olderSessions = sortedSessions.slice(0, midPoint);
  const recentSessions = sortedSessions.slice(midPoint);

  const olderRatings = olderSessions
    .map((s) => s.studentFeedbackRating)
    .filter((r): r is number => r !== null && r !== undefined);
  const recentRatings = recentSessions
    .map((s) => s.studentFeedbackRating)
    .filter((r): r is number => r !== null && r !== undefined);

  const olderAvg =
    olderRatings.length > 0 ? average(olderRatings) : null;
  const recentAvg =
    recentRatings.length > 0 ? average(recentRatings) : null;

  const ratingTrend = calculateTrend(olderAvg, recentAvg);

  // Get recent sessions for supporting data (last 10)
  const recentSessionsForData = sortedSessions
    .slice(-10)
    .reverse() // Most recent first
    .map((s) => s as Session);

  return {
    tutorId,
    windowStart,
    windowEnd,
    totalSessions,
    firstSessions,
    noShowCount,
    noShowRate,
    lateCount,
    lateRate,
    avgLatenessMinutes,
    earlyEndCount,
    earlyEndRate,
    avgEarlyEndMinutes,
    rescheduleCount,
    rescheduleRate,
    tutorInitiatedReschedules,
    avgStudentRating,
    avgFirstSessionRating,
    ratingTrend,
    recentSessions: recentSessionsForData,
  };
}

/**
 * High Reschedule Rate Detection Rule
 * 
 * Detects when a tutor has a reschedule rate above the configured threshold.
 * Default threshold is 15% (configurable via RulesEngineConfig).
 * 
 * This is an aggregate-level rule that evaluates tutor statistics over a time window.
 * Requires minimum number of sessions (config.minSessionsForAggregateRules) to trigger.
 * 
 * @param context - Rule evaluation context (must include tutorStats)
 * @returns RuleResult indicating if high reschedule rate flag should be created
 */
export function detectHighRescheduleRate(context: RuleContext): RuleResult {
  const { tutorStats, config } = context;

  // Aggregate-level rule requires tutor stats
  if (!tutorStats) {
    return createNoTriggerResult("high_reschedule_rate");
  }

  // Require minimum sessions for aggregate rules
  if (tutorStats.totalSessions < config.minSessionsForAggregateRules) {
    return createNoTriggerResult("high_reschedule_rate");
  }

  // Check if reschedule rate exceeds threshold
  if (
    tutorStats.rescheduleRate === null ||
    tutorStats.rescheduleRate <= config.highRescheduleRateThreshold
  ) {
    return createNoTriggerResult("high_reschedule_rate");
  }

  // Determine severity based on reschedule rate
  let severity: FlagSeverity;
  const reschedulePercent = tutorStats.rescheduleRate * 100;
  if (reschedulePercent >= 30) {
    severity = "critical"; // Very high (>30%)
  } else if (reschedulePercent >= 25) {
    severity = "high"; // High (25-30%)
  } else if (reschedulePercent >= 20) {
    severity = "medium"; // Moderate (20-25%)
  } else {
    severity = "low"; // Slightly above threshold (15-20%)
  }

  // Calculate tutor-initiated percentage
  const tutorInitiatedPercent =
    tutorStats.totalSessions > 0
      ? (tutorStats.tutorInitiatedReschedules / tutorStats.totalSessions) * 100
      : 0;

  return createRuleResult(
    "high_reschedule_rate",
    severity,
    `High reschedule rate: ${reschedulePercent.toFixed(1)}% (${tutorStats.rescheduleCount}/${tutorStats.totalSessions} sessions)`,
    `Tutor ${tutorStats.tutorId} has rescheduled ${tutorStats.rescheduleCount} out of ${tutorStats.totalSessions} sessions (${reschedulePercent.toFixed(1)}%) in the last ${config.aggregateWindowDays} days. ${tutorInitiatedPercent.toFixed(1)}% were tutor-initiated. High reschedule rates can indicate scheduling issues or reliability problems.`,
    {
      recommendedAction: "Review tutor's schedule management and availability. Discuss rescheduling patterns and identify root causes. Consider coaching on time management and commitment if tutor-initiated reschedules are high.",
      supportingData: {
        sessions: tutorStats.recentSessions
          ?.filter((s) => s.wasRescheduled)
          .slice(0, 10)
          .map((s) => ({
            sessionId: s.sessionId,
            date: s.sessionStartTime.toISOString(),
            reason: `Rescheduled by ${s.rescheduledBy || "unknown"}`,
          })),
        metrics: {
          rescheduleRate: tutorStats.rescheduleRate,
          rescheduleCount: tutorStats.rescheduleCount,
          totalSessions: tutorStats.totalSessions,
          tutorInitiatedReschedules: tutorStats.tutorInitiatedReschedules,
          tutorInitiatedPercent,
          threshold: config.highRescheduleRateThreshold,
          windowDays: config.aggregateWindowDays,
        },
        trend: tutorStats.ratingTrend ?? undefined,
      },
      confidence: 0.9, // High confidence - reschedule rate is measurable
    }
  );
}

/**
 * Chronic Lateness Detection Rule
 * 
 * Detects when a tutor has a late rate above the configured threshold.
 * Default threshold is 30% (configurable via RulesEngineConfig).
 * 
 * This is an aggregate-level rule that evaluates tutor statistics over a time window.
 * Requires minimum number of sessions (config.minSessionsForAggregateRules) to trigger.
 * 
 * @param context - Rule evaluation context (must include tutorStats)
 * @returns RuleResult indicating if chronic lateness flag should be created
 */
export function detectChronicLateness(context: RuleContext): RuleResult {
  const { tutorStats, config } = context;

  // Aggregate-level rule requires tutor stats
  if (!tutorStats) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Require minimum sessions for aggregate rules
  if (tutorStats.totalSessions < config.minSessionsForAggregateRules) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Check if late rate exceeds threshold
  if (
    tutorStats.lateRate === null ||
    tutorStats.lateRate <= config.chronicLatenessRateThreshold
  ) {
    return createNoTriggerResult("chronic_lateness");
  }

  // Determine severity based on late rate and average lateness
  let severity: FlagSeverity;
  const latePercent = tutorStats.lateRate * 100;
  const avgLateness = tutorStats.avgLatenessMinutes ?? 0;

  if (latePercent >= 50 || avgLateness >= 15) {
    severity = "critical"; // Very high rate or very late on average
  } else if (latePercent >= 40 || avgLateness >= 10) {
    severity = "high"; // High rate or moderately late on average
  } else if (latePercent >= 35 || avgLateness >= 7) {
    severity = "medium"; // Moderate rate or slightly late on average
  } else {
    severity = "low"; // Slightly above threshold
  }

  return createRuleResult(
    "chronic_lateness",
    severity,
    `Chronic lateness: ${latePercent.toFixed(1)}% late (${tutorStats.lateCount}/${tutorStats.totalSessions} sessions)`,
    `Tutor ${tutorStats.tutorId} was late to ${tutorStats.lateCount} out of ${tutorStats.totalSessions} sessions (${latePercent.toFixed(1)}%) in the last ${config.aggregateWindowDays} days. Average lateness: ${avgLateness.toFixed(1)} minutes. Chronic lateness impacts student experience and indicates time management issues.`,
    {
      recommendedAction: "Discuss punctuality expectations with tutor. Review their schedule management and identify root causes. Provide coaching on time management and consider adjusting their schedule if needed.",
      supportingData: {
        sessions: tutorStats.recentSessions
          ?.filter((s) =>
            isLate(s.sessionStartTime, s.tutorJoinTime, config.latenessThresholdMinutes)
          )
          .slice(0, 10)
          .map((s) => {
            const lateness = calculateLateness(s.sessionStartTime, s.tutorJoinTime);
            return {
              sessionId: s.sessionId,
              date: s.sessionStartTime.toISOString(),
              reason: `Late by ${lateness ?? 0} minutes`,
            };
          }),
        metrics: {
          lateRate: tutorStats.lateRate,
          lateCount: tutorStats.lateCount,
          totalSessions: tutorStats.totalSessions,
          avgLatenessMinutes: tutorStats.avgLatenessMinutes ?? 0,
          threshold: config.chronicLatenessRateThreshold,
          latenessThresholdMinutes: config.latenessThresholdMinutes,
          windowDays: config.aggregateWindowDays,
        },
        trend: tutorStats.ratingTrend ?? undefined,
      },
      confidence: 0.9, // High confidence - lateness rate is measurable
    }
  );
}

/**
 * Declining Rating Trend Detection Rule
 * 
 * Detects when a tutor's ratings show a declining trend across time windows.
 * Compares 7-day average < 30-day average < 90-day average to detect decline.
 * 
 * This is an aggregate-level rule that evaluates tutor statistics over multiple time windows.
 * Requires minimum number of sessions in each window to trigger.
 * 
 * @param context - Rule evaluation context (must include tutorStats for 30-day window)
 * @param tutorId - Tutor ID (needed to fetch additional time windows)
 * @param config - Rules engine configuration
 * @returns RuleResult indicating if declining rating trend flag should be created
 */
export async function detectDecliningRatingTrend(
  context: RuleContext,
  tutorId: string
): Promise<RuleResult> {
  const { tutorStats, config } = context;

  // Aggregate-level rule requires tutor stats (30-day window)
  if (!tutorStats) {
    return createNoTriggerResult("low_ratings");
  }

  // Require minimum sessions for aggregate rules
  if (tutorStats.totalSessions < config.minSessionsForAggregateRules) {
    return createNoTriggerResult("low_ratings");
  }

  // Get stats for different time windows
  const windowEnd = new Date();
  const window7dStart = new Date();
  window7dStart.setDate(window7dStart.getDate() - 7);
  const window90dStart = new Date();
  window90dStart.setDate(window90dStart.getDate() - 90);

  const stats7d = await getTutorStats(
    tutorId,
    window7dStart,
    windowEnd,
    config.latenessThresholdMinutes,
    config.earlyEndThresholdMinutes
  );
  const stats90d = await getTutorStats(
    tutorId,
    window90dStart,
    windowEnd,
    config.latenessThresholdMinutes,
    config.earlyEndThresholdMinutes
  );

  // Need ratings for all three windows
  const avg7d = stats7d.avgStudentRating;
  const avg30d = tutorStats.avgStudentRating;
  const avg90d = stats90d.avgStudentRating;

  if (avg7d === null || avg30d === null || avg90d === null) {
    return createNoTriggerResult("low_ratings");
  }

  // Check for declining trend: 7d < 30d < 90d
  const isDeclining = avg7d < avg30d && avg30d < avg90d;

  if (!isDeclining) {
    return createNoTriggerResult("low_ratings");
  }

  // Calculate decline magnitude
  const declineFrom90d = avg90d - avg7d;
  const declinePercent = (declineFrom90d / avg90d) * 100;

  // Determine severity based on decline magnitude and current rating
  let severity: FlagSeverity;
  if (declinePercent >= 20 || avg7d <= 2.5) {
    severity = "critical"; // Very steep decline or very low current rating
  } else if (declinePercent >= 15 || avg7d <= 3.0) {
    severity = "high"; // Steep decline or low current rating
  } else if (declinePercent >= 10 || avg7d <= 3.5) {
    severity = "medium"; // Moderate decline or below-average rating
  } else {
    severity = "low"; // Slight decline
  }

  return createRuleResult(
    "low_ratings",
    severity,
    `Declining rating trend: ${avg7d.toFixed(2)} (7d) < ${avg30d.toFixed(2)} (30d) < ${avg90d.toFixed(2)} (90d)`,
    `Tutor ${tutorStats.tutorId} shows a declining rating trend: ${avg7d.toFixed(2)} stars (7-day avg) < ${avg30d.toFixed(2)} stars (30-day avg) < ${avg90d.toFixed(2)} stars (90-day avg). This represents a ${declinePercent.toFixed(1)}% decline from the 90-day average and may indicate quality issues.`,
    {
      recommendedAction: "Review recent session recordings/transcripts if available. Discuss feedback patterns with tutor. Identify specific areas of concern and provide targeted coaching. Consider pairing with a mentor or additional training.",
      supportingData: {
        sessions: tutorStats.recentSessions
          ?.filter((s) => s.studentFeedbackRating !== null)
          .slice(0, 10)
          .map((s) => ({
            sessionId: s.sessionId,
            date: s.sessionStartTime.toISOString(),
            reason: `Rating: ${s.studentFeedbackRating}/5`,
          })),
        metrics: {
          avgRating7d: avg7d,
          avgRating30d: avg30d,
          avgRating90d: avg90d,
          declineFrom90d,
          declinePercent,
          totalSessions7d: stats7d.totalSessions,
          totalSessions30d: tutorStats.totalSessions,
          totalSessions90d: stats90d.totalSessions,
        },
        trend: "declining",
      },
      confidence: 0.85, // High confidence but slightly lower due to multi-window comparison
    }
  );
}

/**
 * Determine Flag Severity
 * 
 * Helper function to determine flag severity based on percentage thresholds.
 * Provides consistent severity determination across rules.
 * 
 * @param value - Value to evaluate (e.g., percentage, rate)
 * @param thresholds - Thresholds for each severity level
 * @returns FlagSeverity level
 */
export function determineSeverity(
  value: number,
  thresholds: {
    critical?: number; // Value >= this is critical
    high?: number; // Value >= this is high (if not critical)
    medium?: number; // Value >= this is medium (if not high)
    // Below medium threshold is low
  }
): FlagSeverity {
  if (thresholds.critical !== undefined && value >= thresholds.critical) {
    return "critical";
  }
  if (thresholds.high !== undefined && value >= thresholds.high) {
    return "high";
  }
  if (thresholds.medium !== undefined && value >= thresholds.medium) {
    return "medium";
  }
  return "low";
}

/**
 * Determine Severity by Rating
 * 
 * Helper function to determine severity based on rating value.
 * Lower ratings indicate more severe issues.
 * 
 * @param rating - Rating value (typically 1-5)
 * @returns FlagSeverity level
 */
export function determineSeverityByRating(rating: number): FlagSeverity {
  if (rating <= 1) {
    return "critical";
  }
  if (rating <= 2) {
    return "high";
  }
  if (rating <= 3) {
    return "medium";
  }
  return "low";
}

