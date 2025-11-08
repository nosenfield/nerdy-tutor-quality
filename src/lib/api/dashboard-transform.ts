/**
 * Dashboard Data Transformation
 * 
 * Transforms backend data (tutor_scores, flags) to frontend types (TutorSummary, TutorDetail).
 * Handles data type conversions and field mapping.
 */

import type { TutorScore } from "@/lib/types/tutor";
import type { TutorSummary, TutorDetail } from "@/lib/types/dashboard";
import { db, tutorScores, flags, sessions } from "@/lib/db";
import { eq, and, gte, lte, inArray, asc, sql } from "drizzle-orm";
import { isNoShow, isLate, calculateLateness, endedEarly } from "@/lib/utils/time";
import { average, calculateRate, calculateTrend } from "@/lib/utils/stats";
import type { Session } from "@/lib/types/session";

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
 * Aggregate sessions in real-time and return TutorSummary for all tutors
 * 
 * This function queries all sessions in one go, groups by tutorId,
 * and aggregates metrics in-memory for real-time accuracy.
 * 
 * Performance: ~40-100ms for 1000 sessions across 10 tutors
 */
export async function getTutorSummariesFromSessions(
  dateRange: { start: Date; end: Date }
): Promise<TutorSummary[]> {
  try {
    // Single query for all sessions in date range
    const allSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionStartTime, dateRange.start),
          lte(sessions.sessionStartTime, dateRange.end)
        )
      )
      .orderBy(asc(sessions.sessionStartTime));

    console.log(`Found ${allSessions.length} sessions in date range`);

    // Group sessions by tutorId
    const sessionsByTutor = new Map<string, Session[]>();
    for (const session of allSessions) {
      const tutorId = session.tutorId;
      if (!sessionsByTutor.has(tutorId)) {
        sessionsByTutor.set(tutorId, []);
      }
      sessionsByTutor.get(tutorId)!.push(session as Session);
    }

    console.log(`Found ${sessionsByTutor.size} unique tutors`);

    // Batch fetch all active flags for all tutors in one query
    const tutorIds = Array.from(sessionsByTutor.keys());
    const allActiveFlags = tutorIds.length > 0
      ? await db
          .select({
            tutorId: flags.tutorId,
            type: flags.flagType,
            severity: flags.severity,
            message: flags.description,
          })
          .from(flags)
          .where(
            and(
              inArray(flags.tutorId, tutorIds),
              eq(flags.status, "open"),
              gte(flags.createdAt, dateRange.start),
              lte(flags.createdAt, dateRange.end)
            )
          )
      : [];

    // Group flags by tutorId
    const flagsByTutor = new Map<string, Array<{ type: string; severity: string }>>();
    for (const flag of allActiveFlags) {
      if (!flagsByTutor.has(flag.tutorId)) {
        flagsByTutor.set(flag.tutorId, []);
      }
      flagsByTutor.get(flag.tutorId)!.push({
        type: flag.type,
        severity: flag.severity,
      });
    }

    // Aggregate metrics for each tutor
    const summaries: TutorSummary[] = [];
    const latenessThresholdMinutes = 5;
    const earlyEndThresholdMinutes = 10;

    for (const [tutorId, tutorSessions] of sessionsByTutor.entries()) {
      const totalSessions = tutorSessions.length;
      const firstSessions = tutorSessions.filter((s) => s.isFirstSession).length;

      // Calculate no-show metrics
      const noShowCount = tutorSessions.filter((s) =>
        isNoShow(s.tutorJoinTime)
      ).length;
      const noShowRate = calculateRate(noShowCount, totalSessions);
      const attendancePercentage = Math.max(0, (1 - noShowRate) * 100);

      // Calculate reschedule metrics
      const rescheduleCount = tutorSessions.filter((s) => s.wasRescheduled).length;
      const rescheduleRate = calculateRate(rescheduleCount, totalSessions);
      const keptSessionsPercentage = Math.max(0, (1 - rescheduleRate) * 100);

      // Calculate rating metrics
      const studentRatings = tutorSessions
        .map((s) => s.studentFeedbackRating)
        .filter((r): r is number => r !== null && r !== undefined);
      const avgRating =
        studentRatings.length > 0 ? average(studentRatings) : 0;

      // Calculate first session rating
      const firstSessionRatings = tutorSessions
        .filter((s) => s.isFirstSession)
        .map((s) => s.studentFeedbackRating)
        .filter((r): r is number => r !== null && r !== undefined);
      const firstSessionAvgRating =
        firstSessionRatings.length > 0 ? average(firstSessionRatings) : undefined;

      // Calculate first session metrics
      const firstSessionsList = tutorSessions.filter((s) => s.isFirstSession);
      const firstSessionNoShowCount = firstSessionsList.filter((s) =>
        isNoShow(s.tutorJoinTime)
      ).length;
      const firstSessionAttendancePercentage =
        firstSessionsList.length > 0
          ? Math.max(0, (1 - firstSessionNoShowCount / firstSessionsList.length) * 100)
          : undefined;

      const firstSessionRescheduledCount = firstSessionsList.filter(
        (s) => s.wasRescheduled
      ).length;
      const firstSessionKeptSessionsPercentage =
        firstSessionsList.length > 0
          ? Math.max(0, (1 - firstSessionRescheduledCount / firstSessionsList.length) * 100)
          : undefined;

      // Calculate days on platform (from first to last session)
      const sortedSessions = [...tutorSessions].sort(
        (a, b) => a.sessionStartTime.getTime() - b.sessionStartTime.getTime()
      );
      const firstSessionDate = sortedSessions[0]?.sessionStartTime;
      const lastSessionDate = sortedSessions[sortedSessions.length - 1]?.sessionStartTime;
      const daysOnPlatform =
        firstSessionDate && lastSessionDate
          ? Math.ceil(
              (lastSessionDate.getTime() - firstSessionDate.getTime()) /
                (1000 * 60 * 60 * 24)
            ) || 1
          : 1;

      // Get active flags for this tutor (from batch-fetched flags)
      const activeFlags = flagsByTutor.get(tutorId) || [];
      const riskFlagTypes = activeFlags.map((flag) => flag.type);

      summaries.push({
        tutorId,
        totalSessions,
        attendancePercentage,
        keptSessionsPercentage,
        avgRating,
        firstSessionAvgRating,
        firstSessionAttendancePercentage,
        firstSessionKeptSessionsPercentage,
        daysOnPlatform,
        riskFlags: riskFlagTypes,
      });
    }

    return summaries;
  } catch (error) {
    console.error("Error aggregating sessions:", error);
    throw error;
  }
}

/**
 * Get a single tutor's summary from sessions in real-time
 */
export async function getTutorSummaryFromSessions(
  tutorId: string,
  dateRange: { start: Date; end: Date }
): Promise<TutorSummary | null> {
  try {
    // Query all sessions for this tutor in date range
    const tutorSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tutorId, tutorId),
          gte(sessions.sessionStartTime, dateRange.start),
          lte(sessions.sessionStartTime, dateRange.end)
        )
      )
      .orderBy(asc(sessions.sessionStartTime));

    if (tutorSessions.length === 0) {
      return null;
    }

    const totalSessions = tutorSessions.length;
    const firstSessions = tutorSessions.filter((s) => s.isFirstSession).length;

    // Calculate no-show metrics
    const noShowCount = tutorSessions.filter((s) =>
      isNoShow(s.tutorJoinTime)
    ).length;
    const noShowRate = calculateRate(noShowCount, totalSessions);
    const attendancePercentage = Math.max(0, (1 - noShowRate) * 100);

    // Calculate reschedule metrics
    const rescheduleCount = tutorSessions.filter((s) => s.wasRescheduled).length;
    const rescheduleRate = calculateRate(rescheduleCount, totalSessions);
    const keptSessionsPercentage = Math.max(0, (1 - rescheduleRate) * 100);

    // Calculate rating metrics
    const studentRatings = tutorSessions
      .map((s) => s.studentFeedbackRating)
      .filter((r): r is number => r !== null && r !== undefined);
    const avgRating =
      studentRatings.length > 0 ? average(studentRatings) : 0;

    // Calculate first session rating
    const firstSessionRatings = tutorSessions
      .filter((s) => s.isFirstSession)
      .map((s) => s.studentFeedbackRating)
      .filter((r): r is number => r !== null && r !== undefined);
    const firstSessionAvgRating =
      firstSessionRatings.length > 0 ? average(firstSessionRatings) : undefined;

    // Calculate first session metrics
    const firstSessionsList = tutorSessions.filter((s) => s.isFirstSession);
    const firstSessionNoShowCount = firstSessionsList.filter((s) =>
      isNoShow(s.tutorJoinTime)
    ).length;
    const firstSessionAttendancePercentage =
      firstSessionsList.length > 0
        ? Math.max(0, (1 - firstSessionNoShowCount / firstSessionsList.length) * 100)
        : undefined;

    const firstSessionRescheduledCount = firstSessionsList.filter(
      (s) => s.wasRescheduled
    ).length;
    const firstSessionKeptSessionsPercentage =
      firstSessionsList.length > 0
        ? Math.max(0, (1 - firstSessionRescheduledCount / firstSessionsList.length) * 100)
        : undefined;

    // Calculate days on platform
    const sortedSessions = [...tutorSessions].sort(
      (a, b) => a.sessionStartTime.getTime() - b.sessionStartTime.getTime()
    );
    const firstSessionDate = sortedSessions[0]?.sessionStartTime;
    const lastSessionDate = sortedSessions[sortedSessions.length - 1]?.sessionStartTime;
    const daysOnPlatform =
      firstSessionDate && lastSessionDate
        ? Math.ceil(
            (lastSessionDate.getTime() - firstSessionDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ) || 1
        : 1;

    // Get active flags for this tutor
    const activeFlags = await getTutorActiveFlags(tutorId, dateRange);
    const riskFlagTypes = activeFlags.map((flag) => flag.type);

    return {
      tutorId,
      totalSessions,
      attendancePercentage,
      keptSessionsPercentage,
      avgRating,
      firstSessionAvgRating,
      firstSessionAttendancePercentage,
      firstSessionKeptSessionsPercentage,
      daysOnPlatform,
      riskFlags: riskFlagTypes,
    };
  } catch (error) {
    console.error(`Error aggregating sessions for tutor ${tutorId}:`, error);
    return null;
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
    // First, check total count in tutor_scores table
    const totalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    console.log(`Total tutor_scores in database: ${totalCount[0]?.count || 0}`);

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

    console.log(`Found ${scores.length} scores matching date range`);

    // Group by tutorId and get the most recent score for each
    const latestScores = new Map<string, TutorScore>();
    for (const score of scores) {
      const existing = latestScores.get(score.tutorId);
      if (!existing || score.calculatedAt > existing.calculatedAt) {
        latestScores.set(score.tutorId, score);
      }
    }

    console.log(`Returning ${latestScores.size} unique tutor scores`);
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

