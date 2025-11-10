/**
 * Flag Detail API Endpoint
 * 
 * GET /api/flags/[id] - Get flag detail with tutor info, related sessions, and interventions
 * 
 * Returns:
 * {
 *   flag: Flag,
 *   tutor: {
 *     tutor_id: string,
 *     current_score: TutorScore
 *   },
 *   related_sessions: SessionData[],
 *   interventions: Intervention[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, flags, tutorScores, sessions, interventions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flagId = id;

    // Get flag by ID
    const flagList = await db
      .select()
      .from(flags)
      .where(eq(flags.id, flagId))
      .limit(1);

    if (flagList.length === 0) {
      return NextResponse.json(
        {
          error: "Flag not found",
          message: `No flag found with id: ${flagId}`,
        },
        { status: 404 }
      );
    }

    const flag = flagList[0];
    const tutorId = flag.tutorId;

    // Get latest score for this tutor
    const allScores = await db
      .select()
      .from(tutorScores)
      .where(eq(tutorScores.tutorId, tutorId))
      .orderBy(desc(tutorScores.calculatedAt))
      .limit(1);

    const currentScore = allScores[0] || null;

    // Get related sessions (if flag has session_id, get that session; otherwise get recent sessions for tutor)
    let relatedSessions: (typeof sessions.$inferSelect)[] = [];
    if (flag.sessionId) {
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, flag.sessionId))
        .limit(1);
      if (session.length > 0) {
        relatedSessions = [session[0]];
      }
    } else {
      // Get recent sessions for this tutor (last 10)
      relatedSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tutorId, tutorId))
        .orderBy(desc(sessions.sessionStartTime))
        .limit(10);
    }

    // Get interventions for this flag (or tutor if flag_id is null)
    const flagInterventions = await db
      .select()
      .from(interventions)
      .where(
        flag.sessionId
          ? eq(interventions.flagId, flagId)
          : eq(interventions.tutorId, tutorId)
      )
      .orderBy(desc(interventions.interventionDate))
      .limit(20);

    // Transform to API format (camelCase to snake_case)
    const transformScore = (score: typeof currentScore) => {
      if (!score) return null;
      return {
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
      };
    };

    const transformSession = (session: typeof relatedSessions[0]) => ({
      session_id: session.sessionId,
      tutor_id: session.tutorId,
      student_id: session.studentId,
      session_start_time: session.sessionStartTime.toISOString(),
      session_end_time: session.sessionEndTime?.toISOString() || null,
      scheduled_start_time: session.sessionStartTime.toISOString(), // sessionStartTime is the scheduled time
      scheduled_end_time: session.sessionEndTime?.toISOString() || null, // sessionEndTime is the scheduled end time
      duration_minutes: session.sessionLengthScheduled || null,
      is_first_session: session.isFirstSession,
      student_rating: session.studentFeedbackRating ? Number(session.studentFeedbackRating) : null,
      tutor_rating: session.tutorFeedbackRating ? Number(session.tutorFeedbackRating) : null,
      feedback_text: session.studentFeedbackDescription || null,
      feedback_rating: session.studentFeedbackRating || null,
      was_rescheduled: session.wasRescheduled,
      rescheduled_by: session.rescheduledBy || null,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
    });

    const transformFlag = (flag: typeof flags.$inferSelect) => ({
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

    const transformIntervention = (intervention: typeof interventions.$inferSelect) => ({
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
        flag: transformFlag(flag),
        tutor: {
          tutor_id: tutorId,
          current_score: transformScore(currentScore),
        },
        related_sessions: relatedSessions.map(transformSession),
        interventions: flagInterventions.map(transformIntervention),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching flag detail:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch flag detail",
      },
      { status: 500 }
    );
  }
}

