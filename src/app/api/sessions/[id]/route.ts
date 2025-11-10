/**
 * Session Detail API Endpoint
 * 
 * GET /api/sessions/[id] - Get session detail by session_id
 * 
 * Returns:
 * {
 *   session: Session
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = id;

    // Query session by session_id
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: `Session with ID '${sessionId}' not found`,
        },
        { status: 404 }
      );
    }

    // Transform session to API format (camelCase to snake_case)
    const sessionResponse = {
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
    };

    return NextResponse.json(
      {
        session: sessionResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error fetching session detail:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch session detail",
      },
      { status: 500 }
    );
  }
}

