/**
 * Tutors API Endpoint
 * 
 * GET /api/tutors - List tutors with scores, filters, sorting, and pagination
 * 
 * Query Parameters:
 * - sort_by: Sort by 'score', 'name' (tutor_id), or 'session_count' (default: 'score')
 * - min_score: Filter by minimum overall_score (0-100)
 * - max_score: Filter by maximum overall_score (0-100)
 * - has_flags: Filter by tutors with open flags (true/false)
 * - limit: Number of results per page (1-100, default: 50)
 * - offset: Number of results to skip (default: 0)
 * 
 * Returns:
 * {
 *   tutors: Tutor[],
 *   pagination: {
 *     limit: number,
 *     offset: number,
 *     total: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tutorScores, flags } from "@/lib/db";
import { tutorsQuerySchema } from "@/lib/utils/validation";
import { eq, and, gte, lte, desc, asc, count, sql, inArray, isNull, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      sort_by: searchParams.get("sort_by") || undefined,
      min_score: searchParams.get("min_score") || undefined,
      max_score: searchParams.get("max_score") || undefined,
      has_flags:
        searchParams.get("has_flags") === "true"
          ? true
          : searchParams.get("has_flags") === "false"
          ? false
          : undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    // Validate query parameters with Zod
    const validationResult = tutorsQuerySchema.safeParse(queryParams);

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

    // Get tutors with open flags (for has_flags filter)
    let tutorsWithFlags: string[] = [];
    if (params.has_flags !== undefined) {
      const flaggedTutors = await db
        .selectDistinct({ tutorId: flags.tutorId })
        .from(flags)
        .where(eq(flags.status, "open"));
      tutorsWithFlags = flaggedTutors.map((f) => f.tutorId);
    }

    // Build filter conditions for tutor_scores
    const scoreConditions = [];

    if (params.min_score !== undefined) {
      scoreConditions.push(gte(tutorScores.overallScore, params.min_score));
    }

    if (params.max_score !== undefined) {
      scoreConditions.push(lte(tutorScores.overallScore, params.max_score));
    }

    // Get latest scores for all tutors (or filtered by has_flags)
    let tutorIdsToQuery: string[] | undefined;
    if (params.has_flags === true) {
      tutorIdsToQuery = tutorsWithFlags;
      if (tutorIdsToQuery.length === 0) {
        // No tutors with flags, return empty result
        return NextResponse.json(
          {
            tutors: [],
            pagination: {
              limit: params.limit,
              offset: params.offset,
              total: 0,
            },
          },
          { status: 200 }
        );
      }
    } else if (params.has_flags === false) {
      // Get all tutor IDs from scores
      const allTutorIds = await db
        .selectDistinct({ tutorId: tutorScores.tutorId })
        .from(tutorScores);
      const allIds = allTutorIds.map((t) => t.tutorId);
      tutorIdsToQuery = allIds.filter((id) => !tutorsWithFlags.includes(id));
    }

    // Get all tutor IDs that match the filters (for has_flags and score filters)
    // First, get all scores that match score filters
    let baseConditions = [];
    if (scoreConditions.length > 0) {
      baseConditions.push(...scoreConditions);
    }
    if (tutorIdsToQuery !== undefined) {
      baseConditions.push(inArray(tutorScores.tutorId, tutorIdsToQuery));
    }

    // Get all matching scores grouped by tutor_id to find latest
    const allMatchingScores = baseConditions.length > 0
      ? await db
          .select()
          .from(tutorScores)
          .where(and(...baseConditions))
      : await db
          .select()
          .from(tutorScores);

    if (allMatchingScores.length === 0) {
      return NextResponse.json(
        {
          tutors: [],
          pagination: {
            limit: params.limit,
            offset: params.offset,
            total: 0,
          },
        },
        { status: 200 }
      );
    }

    // Group by tutor_id and get the most recent score for each
    const latestScoresMap = new Map<string, typeof allMatchingScores[0]>();
    for (const score of allMatchingScores) {
      const existing = latestScoresMap.get(score.tutorId);
      if (!existing || score.calculatedAt > existing.calculatedAt) {
        latestScoresMap.set(score.tutorId, score);
      }
    }

    const latestScores = Array.from(latestScoresMap.values());

    // Get tutors with flags for has_flags field
    const tutorsWithFlagsSet = new Set(tutorsWithFlags);

    // Combine scores with flag information
    let tutorsList = latestScores.map((score) => ({
      ...score,
      hasFlags: tutorsWithFlagsSet.has(score.tutorId),
    }));

    // Apply sorting
    const sortBy = params.sort_by || "score";
    if (sortBy === "score") {
      tutorsList.sort((a, b) => {
        const scoreA = a.overallScore ?? -1; // Null scores go to end
        const scoreB = b.overallScore ?? -1;
        return scoreB - scoreA; // DESC
      });
    } else if (sortBy === "name") {
      tutorsList.sort((a, b) => a.tutorId.localeCompare(b.tutorId)); // ASC
    } else if (sortBy === "session_count") {
      tutorsList.sort((a, b) => b.totalSessions - a.totalSessions); // DESC
    }

    // Get total count before pagination
    const total = tutorsList.length;

    // Apply pagination
    const paginatedTutors = tutorsList.slice(params.offset, params.offset + params.limit);

    // Transform to API format (camelCase to snake_case)
    const tutorsResponse = paginatedTutors.map((tutor) => ({
      id: tutor.id,
      tutor_id: tutor.tutorId,
      calculated_at: tutor.calculatedAt.toISOString(),
      window_start: tutor.windowStart.toISOString(),
      window_end: tutor.windowEnd.toISOString(),
      total_sessions: tutor.totalSessions,
      first_sessions: tutor.firstSessions,
      no_show_count: tutor.noShowCount,
      no_show_rate: tutor.noShowRate ? Number(tutor.noShowRate) : null,
      late_count: tutor.lateCount,
      late_rate: tutor.lateRate ? Number(tutor.lateRate) : null,
      avg_lateness_minutes: tutor.avgLatenessMinutes ? Number(tutor.avgLatenessMinutes) : null,
      early_end_count: tutor.earlyEndCount,
      early_end_rate: tutor.earlyEndRate ? Number(tutor.earlyEndRate) : null,
      avg_early_end_minutes: tutor.avgEarlyEndMinutes ? Number(tutor.avgEarlyEndMinutes) : null,
      reschedule_count: tutor.rescheduleCount,
      reschedule_rate: tutor.rescheduleRate ? Number(tutor.rescheduleRate) : null,
      tutor_initiated_reschedules: tutor.tutorInitiatedReschedules,
      avg_student_rating: tutor.avgStudentRating ? Number(tutor.avgStudentRating) : null,
      avg_first_session_rating: tutor.avgFirstSessionRating ? Number(tutor.avgFirstSessionRating) : null,
      rating_trend: tutor.ratingTrend,
      overall_score: tutor.overallScore,
      confidence_score: tutor.confidenceScore ? Number(tutor.confidenceScore) : null,
      created_at: tutor.createdAt.toISOString(),
      has_flags: tutor.hasFlags,
    }));

    return NextResponse.json(
      {
        tutors: tutorsResponse,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tutors:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch tutors",
      },
      { status: 500 }
    );
  }
}

