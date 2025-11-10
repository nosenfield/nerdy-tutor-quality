/**
 * Analytics Trends API Endpoint
 * 
 * GET /api/analytics/trends - Get time-series trends data
 * 
 * Query Parameters:
 * - metric: 'avg_score' | 'flag_rate' | 'no_show_rate' | 'reschedule_rate'
 * - period: '7d' | '30d' | '90d' | '1y'
 * - group_by: 'day' | 'week' | 'month' (default: 'day')
 * 
 * Returns:
 * {
 *   metric: string,
 *   period: string,
 *   group_by: string,
 *   data: Array<{
 *     date: string, // ISO 8601
 *     value: number
 *   }>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tutorScores, flags, sessions } from "@/lib/db";
import { analyticsTrendsQuerySchema } from "@/lib/utils/validation";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      metric: searchParams.get("metric") || undefined,
      period: searchParams.get("period") || undefined,
      group_by: searchParams.get("group_by") || "day",
    };

    // Validate query parameters with Zod
    const validationResult = analyticsTrendsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    switch (params.period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Determine SQL date truncation based on group_by
    let dateTrunc: string;
    switch (params.group_by) {
      case "day":
        dateTrunc = "day";
        break;
      case "week":
        dateTrunc = "week";
        break;
      case "month":
        dateTrunc = "month";
        break;
      default:
        dateTrunc = "day";
    }

    let data: Array<{ date: string; value: number }> = [];

    if (params.metric === "avg_score") {
      // Get average score by time period
      // DATE_TRUNC requires string literal for first parameter, so we validate it first
      const dateTruncSql = sql`DATE_TRUNC(${sql.raw(`'${dateTrunc}'`)}, ${tutorScores.calculatedAt})`;
      const scores = await db
        .select({
          date: sql<string>`${dateTruncSql}::text`,
          value: sql<number>`AVG(${tutorScores.overallScore})::float`,
        })
        .from(tutorScores)
        .where(
          and(
            gte(tutorScores.calculatedAt, startDate),
            lte(tutorScores.calculatedAt, now),
            sql`${tutorScores.overallScore} IS NOT NULL`
          )
        )
        .groupBy(dateTruncSql)
        .orderBy(dateTruncSql);

      data = scores.map((row) => ({
        date: row.date,
        value: row.value ? Number(row.value) : 0,
      }));
    } else if (params.metric === "flag_rate") {
      // Get flag rate by time period
      const flagDateTrunc = sql`DATE_TRUNC(${sql.raw(`'${dateTrunc}'`)}, ${flags.createdAt})`;
      const sessionDateTrunc = sql`DATE_TRUNC(${sql.raw(`'${dateTrunc}'`)}, ${sessions.sessionStartTime})`;
      
      const flagRates = await db
        .select({
          date: sql<string>`${flagDateTrunc}::text`,
          flagCount: count(flags.id),
        })
        .from(flags)
        .where(
          and(
            gte(flags.createdAt, startDate),
            lte(flags.createdAt, now)
          )
        )
        .groupBy(flagDateTrunc);

      const sessionCounts = await db
        .select({
          date: sql<string>`${sessionDateTrunc}::text`,
          sessionCount: count(sessions.sessionId),
        })
        .from(sessions)
        .where(
          and(
            gte(sessions.sessionStartTime, startDate),
            lte(sessions.sessionStartTime, now)
          )
        )
        .groupBy(sessionDateTrunc);

      // Combine flag counts and session counts to calculate rates
      const sessionCountMap = new Map(
        sessionCounts.map((s) => [s.date, s.sessionCount])
      );

      data = flagRates.map((row) => {
        const sessionCount = sessionCountMap.get(row.date) || 0;
        const rate = sessionCount > 0 ? row.flagCount / sessionCount : 0;
        return {
          date: row.date,
          value: rate,
        };
      });
    } else if (params.metric === "no_show_rate") {
      // Get no-show rate by time period
      const dateTruncSql = sql`DATE_TRUNC(${sql.raw(`'${dateTrunc}'`)}, ${tutorScores.calculatedAt})`;
      const noShowRates = await db
        .select({
          date: sql<string>`${dateTruncSql}::text`,
          value: sql<number>`AVG(${tutorScores.noShowRate})::float`,
        })
        .from(tutorScores)
        .where(
          and(
            gte(tutorScores.calculatedAt, startDate),
            lte(tutorScores.calculatedAt, now),
            sql`${tutorScores.noShowRate} IS NOT NULL`
          )
        )
        .groupBy(dateTruncSql)
        .orderBy(dateTruncSql);

      data = noShowRates.map((row) => ({
        date: row.date,
        value: row.value ? Number(row.value) : 0,
      }));
    } else if (params.metric === "reschedule_rate") {
      // Get reschedule rate by time period
      const dateTruncSql = sql`DATE_TRUNC(${sql.raw(`'${dateTrunc}'`)}, ${tutorScores.calculatedAt})`;
      const rescheduleRates = await db
        .select({
          date: sql<string>`${dateTruncSql}::text`,
          value: sql<number>`AVG(${tutorScores.rescheduleRate})::float`,
        })
        .from(tutorScores)
        .where(
          and(
            gte(tutorScores.calculatedAt, startDate),
            lte(tutorScores.calculatedAt, now),
            sql`${tutorScores.rescheduleRate} IS NOT NULL`
          )
        )
        .groupBy(dateTruncSql)
        .orderBy(dateTruncSql);

      data = rescheduleRates.map((row) => ({
        date: row.date,
        value: row.value ? Number(row.value) : 0,
      }));
    }

    return NextResponse.json(
      {
        metric: params.metric,
        period: params.period,
        group_by: params.group_by,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics trends:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch analytics trends",
      },
      { status: 500 }
    );
  }
}

