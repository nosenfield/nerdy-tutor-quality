/**
 * Dashboard Data Transformation
 * 
 * Transforms backend data (tutor_scores, flags) to frontend types (TutorSummary, TutorDetail).
 * Handles data type conversions and field mapping.
 */

import type { TutorScore } from "@/lib/types/tutor";
import type { TutorSummary, TutorDetail } from "@/lib/types/dashboard";
import { db, tutorScores, flags, sessions } from "@/lib/db";
import { eq, and, gte, lte, inArray, asc } from "drizzle-orm";
import { isNoShow } from "@/lib/utils/time";

/**
 * Calculate first session metrics from sessions table
 * 
 * Aggregates attendance and kept rates across all first sessions (isFirstSession = true)
 * for a tutor within the date range. A tutor can have multiple first sessions (one per student).
 * 
 * - Attendance: Percentage of first sessions where tutor attended (not a no-show)
 * - Kept: Percentage of first sessions that were kept (not rescheduled)
 */
async function calculateFirstSessionMetrics(
  tutorId: string,
  dateRange: { start: Date; end: Date }
): Promise<{
  attendancePercentage?: number;
  keptSessionsPercentage?: number;
}> {
  try {
    // Query all first sessions (isFirstSession = true) for this tutor within the date range
    // A tutor can have multiple first sessions (one per student)
    const firstSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tutorId, tutorId),
          eq(sessions.isFirstSession, true),
          gte(sessions.sessionStartTime, dateRange.start),
          lte(sessions.sessionStartTime, dateRange.end)
        )
      );

    if (firstSessions.length === 0) {
      return {
        attendancePercentage: undefined,
        keptSessionsPercentage: undefined,
      };
    }

    // Calculate attendance percentage across all first sessions
    // Attendance = percentage of first sessions where tutor attended (not a no-show)
    const noShowCount = firstSessions.filter((s) =>
      isNoShow(s.tutorJoinTime)
    ).length;
    const attendancePercentage =
      firstSessions.length > 0
        ? Math.max(0, (1 - noShowCount / firstSessions.length) * 100)
        : undefined;

    // Calculate kept sessions percentage across all first sessions
    // Kept = percentage of first sessions that were kept (not rescheduled)
    const rescheduledCount = firstSessions.filter(
      (s) => s.wasRescheduled
    ).length;
    const keptSessionsPercentage =
      firstSessions.length > 0
        ? Math.max(0, (1 - rescheduledCount / firstSessions.length) * 100)
        : undefined;

    return {
      attendancePercentage,
      keptSessionsPercentage,
    };
  } catch (error) {
    console.error(
      `Error calculating first session metrics for tutor ${tutorId}:`,
      error
    );
    return {
      attendancePercentage: undefined,
      keptSessionsPercentage: undefined,
    };
  }
}

/**
 * Transform TutorScore to TutorSummary
 */
export async function transformTutorScoreToSummary(
  score: TutorScore,
  activeFlags: Array<{ type: string; severity: string }> = []
): Promise<TutorSummary> {
  // Calculate attendance percentage (100% - no_show_rate)
  const noShowRate = score.noShowRate ? Number(score.noShowRate) : 0;
  const attendancePercentage = Math.max(0, (1 - noShowRate) * 100);

  // Calculate kept sessions percentage (100% - reschedule_rate)
  const rescheduleRate = score.rescheduleRate ? Number(score.rescheduleRate) : 0;
  const keptSessionsPercentage = Math.max(0, (1 - rescheduleRate) * 100);

  // Convert rating from 1-5 scale to number
  const avgRating = score.avgStudentRating
    ? Number(score.avgStudentRating)
    : 0;
  const firstSessionAvgRating = score.avgFirstSessionRating
    ? Number(score.avgFirstSessionRating)
    : undefined;

  // Calculate days on platform from window
  const daysOnPlatform = Math.ceil(
    (score.windowEnd.getTime() - score.windowStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Extract risk flags
  const riskFlagTypes = activeFlags.map((flag) => flag.type);

  // Calculate first session metrics from sessions table
  const firstSessionMetrics = await calculateFirstSessionMetrics(
    score.tutorId,
    {
      start: score.windowStart,
      end: score.windowEnd,
    }
  );

  return {
    tutorId: score.tutorId,
    totalSessions: score.totalSessions,
    attendancePercentage,
    keptSessionsPercentage,
    avgRating,
    firstSessionAvgRating,
    firstSessionAttendancePercentage: firstSessionMetrics.attendancePercentage,
    firstSessionKeptSessionsPercentage: firstSessionMetrics.keptSessionsPercentage,
    daysOnPlatform,
    riskFlags: riskFlagTypes,
  };
}

/**
 * Transform TutorScore to TutorDetail
 */
export function transformTutorScoreToDetail(
  score: TutorScore,
  activeFlags: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
  }> = []
): TutorDetail {
  // Calculate attendance percentage
  const noShowRate = score.noShowRate ? Number(score.noShowRate) : 0;
  const attendancePercentage = Math.max(0, (1 - noShowRate) * 100);

  // Calculate kept sessions percentage
  const rescheduleRate = score.rescheduleRate ? Number(score.rescheduleRate) : 0;
  const keptSessionsPercentage = Math.max(0, (1 - rescheduleRate) * 100);

  // Convert rating from 1-5 scale to number
  const avgRating = score.avgStudentRating
    ? Number(score.avgStudentRating)
    : 0;
  const firstSessionAvgRating = score.avgFirstSessionRating
    ? Number(score.avgFirstSessionRating)
    : undefined;

  // Calculate days on platform
  const daysOnPlatform = Math.ceil(
    (score.windowEnd.getTime() - score.windowStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Transform flags
  const riskFlags = activeFlags.map((flag) => ({
    type: flag.type,
    severity: flag.severity,
    message: flag.message,
  }));

  return {
    tutorId: score.tutorId,
    totalSessions: score.totalSessions,
    daysOnPlatform,
    avgRating,
    firstSessionAvgRating,
    attendancePercentage,
    keptSessionsPercentage,
    riskFlags,
  };
}

/**
 * Get active flags for a tutor
 */
export async function getTutorActiveFlags(
  tutorId: string,
  dateRange: { start: Date; end: Date }
): Promise<
  Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
  }>
> {
  try {
    const activeFlags = await db
      .select({
        type: flags.flagType,
        severity: flags.severity,
        message: flags.description,
      })
      .from(flags)
      .where(
        and(
          eq(flags.tutorId, tutorId),
          eq(flags.status, "open"), // Only active flags
          gte(flags.createdAt, dateRange.start),
          lte(flags.createdAt, dateRange.end)
        )
      );

    return activeFlags.map((flag) => ({
      type: flag.type,
      severity: flag.severity as "critical" | "high" | "medium" | "low",
      message: flag.message || `${flag.type} flag`,
    }));
  } catch (error) {
    console.error("Error fetching tutor flags:", error);
    return [];
  }
}

/**
 * Get latest tutor scores for a date range
 * Returns the most recent score for each tutor within the date range
 */
export async function getLatestTutorScores(
  dateRange: { start: Date; end: Date }
): Promise<TutorScore[]> {
  try {
    // Get the most recent score for each tutor
    // where the score window overlaps with the requested date range
    const scores = await db
      .select()
      .from(tutorScores)
      .where(
        and(
          // Score window overlaps with requested range
          lte(tutorScores.windowStart, dateRange.end),
          gte(tutorScores.windowEnd, dateRange.start)
        )
      )
      .orderBy(tutorScores.calculatedAt);

    // Group by tutorId and get the most recent score for each
    const latestScores = new Map<string, TutorScore>();
    for (const score of scores) {
      const existing = latestScores.get(score.tutorId);
      if (!existing || score.calculatedAt > existing.calculatedAt) {
        latestScores.set(score.tutorId, score);
      }
    }

    return Array.from(latestScores.values());
  } catch (error) {
    console.error("Error fetching tutor scores:", error);
    throw error;
  }
}

/**
 * Get flagged tutors (tutors with active flags)
 */
export async function getFlaggedTutorScores(
  dateRange: { start: Date; end: Date }
): Promise<TutorScore[]> {
  try {
    // Get tutors with active flags in the date range
    const flaggedTutorIds = await db
      .selectDistinct({ tutorId: flags.tutorId })
      .from(flags)
      .where(
        and(
          eq(flags.status, "open"), // Only active flags
          gte(flags.createdAt, dateRange.start),
          lte(flags.createdAt, dateRange.end)
        )
      );

    if (flaggedTutorIds.length === 0) {
      return [];
    }

    const tutorIds = flaggedTutorIds.map((f) => f.tutorId);

    // Get latest scores for flagged tutors
    const scores = await db
      .select()
      .from(tutorScores)
      .where(
        and(
          inArray(tutorScores.tutorId, tutorIds),
          lte(tutorScores.windowStart, dateRange.end),
          gte(tutorScores.windowEnd, dateRange.start)
        )
      )
      .orderBy(tutorScores.calculatedAt);

    // Group by tutorId and get the most recent score for each
    const latestScores = new Map<string, TutorScore>();
    for (const score of scores) {
      const existing = latestScores.get(score.tutorId);
      if (!existing || score.calculatedAt > existing.calculatedAt) {
        latestScores.set(score.tutorId, score);
      }
    }

    return Array.from(latestScores.values());
  } catch (error) {
    console.error("Error fetching flagged tutor scores:", error);
    throw error;
  }
}

