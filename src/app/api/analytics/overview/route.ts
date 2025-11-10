/**
 * Analytics Overview API Endpoint
 * 
 * GET /api/analytics/overview - Get dashboard overview statistics
 * 
 * Returns:
 * {
 *   today: {
 *     sessions_processed: number,
 *     flags_raised: number,
 *     tutors_flagged: number
 *   },
 *   trends: {
 *     avg_score: number | null,
 *     avg_score_change: number, // vs. last week
 *     flag_rate: number | null,
 *     flag_rate_change: number // vs. last week
 *   },
 *   top_issues: Array<{
 *     issue: string,
 *     count: number
 *   }>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tutorScores, flags, sessions } from "@/lib/db";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get today's stats
    const todaySessions = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionStartTime, todayStart),
          lte(sessions.sessionStartTime, todayEnd)
        )
      );

    const todayFlags = await db
      .select({ count: count() })
      .from(flags)
      .where(
        and(
          gte(flags.createdAt, todayStart),
          lte(flags.createdAt, todayEnd)
        )
      );

    const todayTutorsFlagged = await db
      .selectDistinct({ tutorId: flags.tutorId })
      .from(flags)
      .where(
        and(
          gte(flags.createdAt, todayStart),
          lte(flags.createdAt, todayEnd),
          eq(flags.status, "open")
        )
      );

    // Get current week average score
    const currentWeekScores = await db
      .select({
        avgScore: sql<number>`AVG(${tutorScores.overallScore})::float`,
      })
      .from(tutorScores)
      .where(
        and(
          gte(tutorScores.calculatedAt, oneWeekAgo),
          lte(tutorScores.calculatedAt, now),
          sql`${tutorScores.overallScore} IS NOT NULL`
        )
      );

    // Get last week average score
    const lastWeekScores = await db
      .select({
        avgScore: sql<number>`AVG(${tutorScores.overallScore})::float`,
      })
      .from(tutorScores)
      .where(
        and(
          gte(tutorScores.calculatedAt, twoWeeksAgo),
          lte(tutorScores.calculatedAt, oneWeekAgo),
          sql`${tutorScores.overallScore} IS NOT NULL`
        )
      );

    // Get current week flag rate
    const currentWeekFlags = await db
      .select({ count: count() })
      .from(flags)
      .where(
        and(
          gte(flags.createdAt, oneWeekAgo),
          lte(flags.createdAt, now)
        )
      );

    const currentWeekSessionsCount = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionStartTime, oneWeekAgo),
          lte(sessions.sessionStartTime, now)
        )
      );

    // Get last week flag rate
    const lastWeekFlags = await db
      .select({ count: count() })
      .from(flags)
      .where(
        and(
          gte(flags.createdAt, twoWeeksAgo),
          lte(flags.createdAt, oneWeekAgo)
        )
      );

    const lastWeekSessionsCount = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionStartTime, twoWeeksAgo),
          lte(sessions.sessionStartTime, oneWeekAgo)
        )
      );

    // Calculate averages and changes
    const currentAvgScore = currentWeekScores[0]?.avgScore
      ? Number(currentWeekScores[0].avgScore)
      : null;
    const lastAvgScore = lastWeekScores[0]?.avgScore
      ? Number(lastWeekScores[0].avgScore)
      : null;
    const avgScoreChange =
      currentAvgScore !== null && lastAvgScore !== null
        ? currentAvgScore - lastAvgScore
        : 0;

    const currentFlagRate =
      currentWeekSessionsCount[0]?.count > 0
        ? (currentWeekFlags[0]?.count || 0) / currentWeekSessionsCount[0].count
        : null;
    const lastFlagRate =
      lastWeekSessionsCount[0]?.count > 0
        ? (lastWeekFlags[0]?.count || 0) / lastWeekSessionsCount[0].count
        : null;
    const flagRateChange =
      currentFlagRate !== null && lastFlagRate !== null
        ? currentFlagRate - lastFlagRate
        : 0;

    // Get top issues (most common flag types)
    const topIssues = await db
      .select({
        flagType: flags.flagType,
        count: count(),
      })
      .from(flags)
      .where(
        and(
          gte(flags.createdAt, oneWeekAgo),
          lte(flags.createdAt, now)
        )
      )
      .groupBy(flags.flagType)
      .orderBy(desc(count()))
      .limit(10);

    return NextResponse.json(
      {
        today: {
          sessions_processed: todaySessions[0]?.count || 0,
          flags_raised: todayFlags[0]?.count || 0,
          tutors_flagged: todayTutorsFlagged.length,
        },
        trends: {
          avg_score: currentAvgScore,
          avg_score_change: avgScoreChange,
          flag_rate: currentFlagRate,
          flag_rate_change: flagRateChange,
        },
        top_issues: topIssues.map((issue) => ({
          issue: issue.flagType,
          count: issue.count,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch analytics overview",
      },
      { status: 500 }
    );
  }
}

