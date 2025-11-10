/**
 * Sessions API Endpoint
 * 
 * GET /api/sessions - List sessions with filters and pagination
 * 
 * Query Parameters:
 * - tutor_id: Filter by tutor ID
 * - student_id: Filter by student ID
 * - start_date: Filter by start date (ISO 8601)
 * - end_date: Filter by end date (ISO 8601)
 * - is_first_session: Filter by first session flag
 * - limit: Number of results per page (1-100, default: 50)
 * - offset: Number of results to skip (default: 0)
 * 
 * Returns:
 * {
 *   sessions: Session[],
 *   pagination: {
 *     limit: number,
 *     offset: number,
 *     total: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { sessionsQuerySchema } from "@/lib/utils/validation";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      tutor_id: searchParams.get("tutor_id") || undefined,
      student_id: searchParams.get("student_id") || undefined,
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
      is_first_session:
        searchParams.get("is_first_session") === "true"
          ? true
          : searchParams.get("is_first_session") === "false"
          ? false
          : undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    // Validate query parameters with Zod
    const validationResult = sessionsQuerySchema.safeParse(queryParams);

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

    // Build filter conditions
    const conditions = [];

    if (params.tutor_id) {
      conditions.push(eq(sessions.tutorId, params.tutor_id));
    }

    if (params.student_id) {
      conditions.push(eq(sessions.studentId, params.student_id));
    }

    if (params.start_date) {
      conditions.push(gte(sessions.sessionStartTime, new Date(params.start_date)));
    }

    if (params.end_date) {
      conditions.push(lte(sessions.sessionStartTime, new Date(params.end_date)));
    }

    if (params.is_first_session !== undefined) {
      conditions.push(eq(sessions.isFirstSession, params.is_first_session));
    }

    // Build query with filters
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(sessions)
      .where(whereClause);

    const total = totalResult?.count || 0;

    // Get paginated sessions
    const sessionsList = await db
      .select()
      .from(sessions)
      .where(whereClause)
      .orderBy(desc(sessions.sessionStartTime))
      .limit(params.limit)
      .offset(params.offset);

    // Transform sessions to API format (camelCase to snake_case for API)
    const sessionsResponse = sessionsList.map((session) => ({
      id: session.id,
      session_id: session.sessionId,
      tutor_id: session.tutorId,
      student_id: session.studentId,
      session_start_time: session.sessionStartTime.toISOString(),
      session_end_time: session.sessionEndTime.toISOString(),
      tutor_join_time: session.tutorJoinTime?.toISOString() || null,
      student_join_time: session.studentJoinTime?.toISOString() || null,
      tutor_leave_time: session.tutorLeaveTime?.toISOString() || null,
      student_leave_time: session.studentLeaveTime?.toISOString() || null,
      subjects_covered: session.subjectsCovered,
      is_first_session: session.isFirstSession,
      session_type: session.sessionType,
      session_length_scheduled: session.sessionLengthScheduled,
      session_length_actual: session.sessionLengthActual,
      was_rescheduled: session.wasRescheduled,
      rescheduled_by: session.rescheduledBy,
      reschedule_count: session.rescheduleCount,
      tutor_feedback_rating: session.tutorFeedbackRating,
      tutor_feedback_description: session.tutorFeedbackDescription,
      student_feedback_rating: session.studentFeedbackRating,
      student_feedback_description: session.studentFeedbackDescription,
      video_url: session.videoUrl,
      transcript_url: session.transcriptUrl,
      ai_summary: session.aiSummary,
      student_booked_followup: session.studentBookedFollowup,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        sessions: sessionsResponse,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch sessions",
      },
      { status: 500 }
    );
  }
}

