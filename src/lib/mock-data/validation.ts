import { db } from "../db";
import { sessions } from "../db/schema";
import { gte } from "drizzle-orm";
import { subDays } from "date-fns";
import type { Session } from "../types/session";

/**
 * Validation Utilities for Mock Data
 * 
 * Validates that generated mock data matches realistic industry benchmarks.
 */

interface ValidationStats {
  totalSessions: number;
  avgRating: number;
  avgFirstSessionRating: number;
  noShowRate: number;
  rescheduleRate: number;
  tutorInitiatedRescheduleRate: number;
  lateRate: number;
  earlyEndRate: number;
  firstSessionChurnRate: number;
}

/**
 * Calculate statistics from sessions data
 */
export async function calculateMockDataStats(
  daysBack: number = 30
): Promise<ValidationStats> {
  const cutoffDate = subDays(new Date(), daysBack);

  const allSessions = await db
    .select()
    .from(sessions)
    .where(gte(sessions.sessionStartTime, cutoffDate));

  const totalSessions = allSessions.length;
  if (totalSessions === 0) {
    throw new Error("No sessions found for validation");
  }

  // Calculate averages
  const sessionsWithRatings = allSessions.filter((s: Session) => s.studentFeedbackRating);
  const avgRating =
    sessionsWithRatings.reduce(
      (sum: number, s: Session) => sum + (s.studentFeedbackRating || 0),
      0
    ) / sessionsWithRatings.length;

  const firstSessions = allSessions.filter((s: Session) => s.isFirstSession);
  const firstSessionsWithRatings = firstSessions.filter(
    (s: Session) => s.studentFeedbackRating
  );
  const avgFirstSessionRating =
    firstSessionsWithRatings.length > 0
      ? firstSessionsWithRatings.reduce(
          (sum: number, s: Session) => sum + (s.studentFeedbackRating || 0),
          0
        ) / firstSessionsWithRatings.length
      : 0;

  // Calculate rates
  const noShowCount = allSessions.filter((s: Session) => !s.tutorJoinTime).length;
  const noShowRate = noShowCount / totalSessions;

  const rescheduledSessions = allSessions.filter((s: Session) => s.wasRescheduled);
  const rescheduleRate = rescheduledSessions.length / totalSessions;

  const tutorInitiatedReschedules = rescheduledSessions.filter(
    (s: Session) => s.rescheduledBy === "tutor"
  ).length;
  const tutorInitiatedRescheduleRate =
    rescheduledSessions.length > 0
      ? tutorInitiatedReschedules / rescheduledSessions.length
      : 0;

  // Calculate lateness (more than 5 minutes late)
  const lateSessions = allSessions.filter((s: Session) => {
    if (!s.tutorJoinTime || !s.sessionStartTime) return false;
    const latenessMinutes =
      (new Date(s.tutorJoinTime).getTime() -
        new Date(s.sessionStartTime).getTime()) /
      (1000 * 60);
    return latenessMinutes > 5;
  });
  const lateRate = lateSessions.length / totalSessions;

  // Calculate early ends (more than 10 minutes early)
  const earlyEndSessions = allSessions.filter((s: Session) => {
    if (!s.tutorLeaveTime || !s.sessionEndTime) return false;
    const earlyEndMinutes =
      (new Date(s.sessionEndTime).getTime() -
        new Date(s.tutorLeaveTime).getTime()) /
      (1000 * 60);
    return earlyEndMinutes > 10;
  });
  const earlyEndRate = earlyEndSessions.length / totalSessions;

  // Calculate first session churn (didn't book follow-up)
  const firstSessionsWithoutFollowup = firstSessions.filter(
    (s: Session) => s.studentBookedFollowup === false
  );
  const firstSessionChurnRate =
    firstSessions.length > 0
      ? firstSessionsWithoutFollowup.length / firstSessions.length
      : 0;

  return {
    totalSessions,
    avgRating,
    avgFirstSessionRating,
    noShowRate,
    rescheduleRate,
    tutorInitiatedRescheduleRate,
    lateRate,
    earlyEndRate,
    firstSessionChurnRate,
  };
}

/**
 * Validate mock data against industry benchmarks
 */
export async function validateMockData(
  daysBack: number = 30
): Promise<{
  valid: boolean;
  stats: ValidationStats;
  errors: string[];
}> {
  const stats = await calculateMockDataStats(daysBack);
  const errors: string[] = [];

  // Validation checks based on industry benchmarks
  if (stats.avgRating < 4.0 || stats.avgRating > 4.5) {
    errors.push(
      `Average rating ${stats.avgRating.toFixed(2)} outside expected range (4.0-4.5)`
    );
  }

  if (stats.noShowRate < 0.02 || stats.noShowRate > 0.05) {
    errors.push(
      `No-show rate ${(stats.noShowRate * 100).toFixed(2)}% outside expected range (2-5%)`
    );
  }

  if (stats.rescheduleRate < 0.1 || stats.rescheduleRate > 0.15) {
    errors.push(
      `Reschedule rate ${(stats.rescheduleRate * 100).toFixed(2)}% outside expected range (10-15%)`
    );
  }

  if (
    stats.tutorInitiatedRescheduleRate < 0.95 ||
    stats.tutorInitiatedRescheduleRate > 1.0
  ) {
    errors.push(
      `Tutor-initiated reschedule rate ${(stats.tutorInitiatedRescheduleRate * 100).toFixed(2)}% outside expected range (95-100%)`
    );
  }

  if (stats.firstSessionChurnRate < 0.2 || stats.firstSessionChurnRate > 0.28) {
    errors.push(
      `First session churn rate ${(stats.firstSessionChurnRate * 100).toFixed(2)}% outside expected range (20-28%)`
    );
  }

  if (stats.avgFirstSessionRating < stats.avgRating - 0.3) {
    errors.push(
      `First session rating ${stats.avgFirstSessionRating.toFixed(2)} is significantly lower than overall rating ${stats.avgRating.toFixed(2)}`
    );
  }

  return {
    valid: errors.length === 0,
    stats,
    errors,
  };
}

/**
 * Print validation report
 */
export function printValidationReport(
  validation: Awaited<ReturnType<typeof validateMockData>>
) {
  console.log("\n📊 Mock Data Validation Report");
  console.log("=" .repeat(50));
  console.log(`\nTotal Sessions: ${validation.stats.totalSessions}`);
  console.log(`\nAverage Rating: ${validation.stats.avgRating.toFixed(2)}`);
  console.log(
    `Average First Session Rating: ${validation.stats.avgFirstSessionRating.toFixed(2)}`
  );
  console.log(
    `\nNo-Show Rate: ${(validation.stats.noShowRate * 100).toFixed(2)}%`
  );
  console.log(
    `Reschedule Rate: ${(validation.stats.rescheduleRate * 100).toFixed(2)}%`
  );
  console.log(
    `Tutor-Initiated Reschedules: ${(validation.stats.tutorInitiatedRescheduleRate * 100).toFixed(2)}%`
  );
  console.log(`Late Rate: ${(validation.stats.lateRate * 100).toFixed(2)}%`);
  console.log(
    `Early End Rate: ${(validation.stats.earlyEndRate * 100).toFixed(2)}%`
  );
  console.log(
    `First Session Churn Rate: ${(validation.stats.firstSessionChurnRate * 100).toFixed(2)}%`
  );

  if (validation.valid) {
    console.log("\n✅ Validation PASSED - Data matches industry benchmarks");
  } else {
    console.log("\n❌ Validation FAILED:");
    validation.errors.forEach((error) => console.log(`   - ${error}`));
  }
  console.log("=" .repeat(50));
}
