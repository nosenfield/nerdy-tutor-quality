/**
 * Tutor Detail API Endpoint
 * 
 * GET /api/tutors/[id] - Get tutor detail with current score, recent sessions, active flags, performance history, and interventions
 * 
 * Returns:
 * {
 *   tutor_id: string,
 *   current_score: TutorScore,
 *   recent_sessions: SessionData[],
 *   active_flags: Flag[],
 *   performance_history: TutorScore[],
 *   interventions: Intervention[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tutorScores, sessions, flags, interventions } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;

    // Get latest score for this tutor
    const allScores = await db
      .select()
      .from(tutorScores)
      .where(eq(tutorScores.tutorId, tutorId))
      .orderBy(desc(tutorScores.calculatedAt));

    if (allScores.length === 0) {
      return NextResponse.json(
        {
          error: "Tutor not found",
          message: `No scores found for tutor_id: ${tutorId}`,
        },
        { status: 404 }
      );
    }

    const currentScore = allScores[0];
    const performanceHistory = allScores.slice(0, 10); // Last 10 scores

    // Get recent sessions (last 20)
    const recentSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tutorId, tutorId))
      .orderBy(desc(sessions.sessionStartTime))
      .limit(20);

    // Get active flags (status = 'open')
    const activeFlags = await db
      .select()
      .from(flags)
      .where(and(eq(flags.tutorId, tutorId), eq(flags.status, "open")))
      .orderBy(desc(flags.createdAt));

    // Get interventions for this tutor
    const tutorInterventions = await db
      .select()
      .from(interventions)
      .where(eq(interventions.tutorId, tutorId))
      .orderBy(desc(interventions.interventionDate))
      .limit(20);

    // Transform to API format (camelCase to snake_case)
    const transformScore = (score: typeof currentScore) => ({
      id: score.id,
      tutor_id: score.tutorId,
      calculated_at: score.calculatedAt.toISOString(),
      window_start: score.windowStart.toISOString(),
      window_end: score.windowEnd.toISOString(),
      total_sessions: score.totalSessions,
      first_sessions: score.firstSessions,
      no_show_count: score.noShowCount,
      no_show_rate: score.noShowRate ? Number(score.noShowRate) : null,
      late_count: score.lateCount,
      late_rate: score.lateRate ? Number(score.lateRate) : null,
      avg_lateness_minutes: score.avgLatenessMinutes ? Number(score.avgLatenessMinutes) : null,
      early_end_count: score.earlyEndCount,
      early_end_rate: score.earlyEndRate ? Number(score.earlyEndRate) : null,
      avg_early_end_minutes: score.avgEarlyEndMinutes ? Number(score.avgEarlyEndMinutes) : null,
      reschedule_count: score.rescheduleCount,
      reschedule_rate: score.rescheduleRate ? Number(score.rescheduleRate) : null,
      tutor_initiated_reschedules: score.tutorInitiatedReschedules,
      avg_student_rating: score.avgStudentRating ? Number(score.avgStudentRating) : null,
      avg_first_session_rating: score.avgFirstSessionRating ? Number(score.avgFirstSessionRating) : null,
      rating_trend: score.ratingTrend,
      overall_score: score.overallScore,
      confidence_score: score.confidenceScore ? Number(score.confidenceScore) : null,
      created_at: score.createdAt.toISOString(),
    });

    const transformSession = (session: typeof recentSessions[0]) => ({
      session_id: session.sessionId,
      tutor_id: session.tutorId,
      student_id: session.studentId,
      session_start_time: session.sessionStartTime.toISOString(),
      session_end_time: session.sessionEndTime?.toISOString() || null,
      scheduled_start_time: session.scheduledStartTime.toISOString(),
      scheduled_end_time: session.scheduledEndTime.toISOString(),
      duration_minutes: session.durationMinutes,
      is_first_session: session.isFirstSession,
      student_rating: session.studentRating ? Number(session.studentRating) : null,
      tutor_rating: session.tutorRating ? Number(session.tutorRating) : null,
      feedback_text: session.feedbackText,
      feedback_rating: session.feedbackRating,
      was_rescheduled: session.wasRescheduled,
      rescheduled_by: session.rescheduledBy,
      reschedule_reason: session.rescheduleReason,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
    });

    const transformFlag = (flag: typeof activeFlags[0]) => ({
      id: flag.id,
      tutor_id: flag.tutorId,
      session_id: flag.sessionId,
      flag_type: flag.flagType,
      severity: flag.severity,
      title: flag.title,
      description: flag.description,
      recommended_action: flag.recommendedAction,
      supporting_data: flag.supportingData,
      status: flag.status,
      resolved_at: flag.resolvedAt?.toISOString() || null,
      resolved_by: flag.resolvedBy,
      resolution_notes: flag.resolutionNotes,
      coach_agreed: flag.coachAgreed,
      created_at: flag.createdAt.toISOString(),
      updated_at: flag.updatedAt.toISOString(),
    });

    const transformIntervention = (intervention: typeof tutorInterventions[0]) => ({
      id: intervention.id,
      flag_id: intervention.flagId,
      tutor_id: intervention.tutorId,
      intervention_type: intervention.interventionType,
      description: intervention.description,
      coach_id: intervention.coachId,
      intervention_date: intervention.interventionDate.toISOString(),
      follow_up_date: intervention.followUpDate?.toISOString() || null,
      outcome: intervention.outcome,
      outcome_notes: intervention.outcomeNotes,
      created_at: intervention.createdAt.toISOString(),
    });

    return NextResponse.json(
      {
        tutor_id: tutorId,
        current_score: transformScore(currentScore),
        recent_sessions: recentSessions.map(transformSession),
        active_flags: activeFlags.map(transformFlag),
        performance_history: performanceHistory.map(transformScore),
        interventions: tutorInterventions.map(transformIntervention),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tutor detail:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch tutor detail",
      },
      { status: 500 }
    );
  }
}

