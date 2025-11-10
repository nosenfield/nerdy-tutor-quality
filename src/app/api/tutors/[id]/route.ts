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
import { eq, and, desc, inArray, gte, lte } from "drizzle-orm";
import { getTutorStats, type TutorStats } from "@/lib/scoring/rules-engine";
import { calculateAllScores } from "@/lib/scoring/aggregator";
import { subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { randomUUID } from "node:crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;

    // Parse date range from query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("start_date");
    const endDateParam = searchParams.get("end_date");
    
    let windowStart: Date | undefined;
    let windowEnd: Date | undefined;
    
    if (startDateParam && endDateParam) {
      windowStart = new Date(startDateParam);
      windowEnd = new Date(endDateParam);
    } else {
      // Default to last 30 days if no date range provided
      windowEnd = new Date();
      windowStart = subDays(windowEnd, 30);
    }

    // Get latest score for this tutor
    const allScores = await db
      .select()
      .from(tutorScores)
      .where(eq(tutorScores.tutorId, tutorId))
      .orderBy(desc(tutorScores.calculatedAt));

    let currentScore: typeof allScores[0] | null = null;
    let performanceHistory: typeof allScores = [];

    // If no scores exist, calculate on the fly from sessions
    if (allScores.length === 0) {
      // Check if tutor has any sessions
      const tutorSessionsCheck = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tutorId, tutorId))
        .limit(1);

      if (tutorSessionsCheck.length === 0) {
        return NextResponse.json(
          {
            error: "Tutor not found",
            message: `No sessions or scores found for tutor_id: ${tutorId}`,
          },
          { status: 404 }
        );
      }

      // Calculate score on the fly using the date range
      
      try {
        const stats = await getTutorStats(tutorId, windowStart, windowEnd);
        const { overallScore, confidenceScore, breakdown } = calculateAllScores(stats);

        // Create a virtual score object for the response
        // We'll use a minimal structure that matches the expected format
        const tempId = randomUUID();
        currentScore = {
          id: tempId,
          tutorId: tutorId,
          calculatedAt: windowEnd,
          windowStart: windowStart,
          windowEnd: windowEnd,
          totalSessions: stats.totalSessions,
          firstSessions: stats.firstSessions,
          noShowCount: stats.noShowCount,
          noShowRate: stats.noShowRate ? String(stats.noShowRate) : null,
          lateCount: stats.lateCount,
          lateRate: stats.lateRate ? String(stats.lateRate) : null,
          avgLatenessMinutes: stats.avgLatenessMinutes ? String(stats.avgLatenessMinutes) : null,
          earlyEndCount: stats.earlyEndCount,
          earlyEndRate: stats.earlyEndRate ? String(stats.earlyEndRate) : null,
          avgEarlyEndMinutes: stats.avgEarlyEndMinutes ? String(stats.avgEarlyEndMinutes) : null,
          rescheduleCount: stats.rescheduleCount,
          rescheduleRate: stats.rescheduleRate ? String(stats.rescheduleRate) : null,
          tutorInitiatedReschedules: stats.tutorInitiatedReschedules,
          avgStudentRating: stats.avgStudentRating ? String(stats.avgStudentRating) : null,
          avgFirstSessionRating: stats.avgFirstSessionRating ? String(stats.avgFirstSessionRating) : null,
          ratingTrend: stats.ratingTrend,
          overallScore: overallScore ? Math.round(overallScore) : null,
          confidenceScore: confidenceScore ? String(confidenceScore) : null,
          createdAt: windowEnd,
        } as typeof allScores[0];

        // Generate performance history from session data (monthly windows for last 6 months)
        // This creates a timeline even when scores aren't pre-calculated
        const historyEntries: typeof allScores = [];
        const now = new Date();
        
        // Calculate scores for each of the last 6 months
        for (let i = 0; i < 6; i++) {
          const monthEnd = i === 0 ? now : endOfMonth(subMonths(now, i));
          const monthStart = startOfMonth(subMonths(now, i));
          
          // Only calculate if we have sessions in this period
          const monthSessions = await db
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.tutorId, tutorId),
                gte(sessions.sessionStartTime, monthStart),
                lte(sessions.sessionStartTime, monthEnd)
              )
            )
            .limit(1);
          
          if (monthSessions.length > 0) {
            try {
              const monthStats = await getTutorStats(tutorId, monthStart, monthEnd);
              const { overallScore: monthScore } = calculateAllScores(monthStats);
              
              if (monthScore !== null) {
                historyEntries.push({
                  id: randomUUID(),
                  tutorId: tutorId,
                  calculatedAt: monthEnd,
                  windowStart: monthStart,
                  windowEnd: monthEnd,
                  totalSessions: monthStats.totalSessions,
                  firstSessions: monthStats.firstSessions,
                  noShowCount: monthStats.noShowCount,
                  noShowRate: monthStats.noShowRate ? String(monthStats.noShowRate) : null,
                  lateCount: monthStats.lateCount,
                  lateRate: monthStats.lateRate ? String(monthStats.lateRate) : null,
                  avgLatenessMinutes: monthStats.avgLatenessMinutes ? String(monthStats.avgLatenessMinutes) : null,
                  earlyEndCount: monthStats.earlyEndCount,
                  earlyEndRate: monthStats.earlyEndRate ? String(monthStats.earlyEndRate) : null,
                  avgEarlyEndMinutes: monthStats.avgEarlyEndMinutes ? String(monthStats.avgEarlyEndMinutes) : null,
                  rescheduleCount: monthStats.rescheduleCount,
                  rescheduleRate: monthStats.rescheduleRate ? String(monthStats.rescheduleRate) : null,
                  tutorInitiatedReschedules: monthStats.tutorInitiatedReschedules,
                  avgStudentRating: monthStats.avgStudentRating ? String(monthStats.avgStudentRating) : null,
                  avgFirstSessionRating: monthStats.avgFirstSessionRating ? String(monthStats.avgFirstSessionRating) : null,
                  ratingTrend: monthStats.ratingTrend,
                  overallScore: monthScore ? Math.round(monthScore) : null,
                  confidenceScore: null,
                  createdAt: monthEnd,
                } as typeof allScores[0]);
              }
            } catch (monthError) {
              // Skip this month if calculation fails
              console.error(`Error calculating score for month ${i}:`, monthError);
            }
          }
        }
        
        // Sort by date (oldest first) and limit to 10 entries
        performanceHistory = historyEntries
          .sort((a, b) => a.calculatedAt.getTime() - b.calculatedAt.getTime())
          .slice(-10);
      } catch (calcError) {
        console.error("Error calculating score on the fly:", calcError);
        return NextResponse.json(
          {
            error: "Internal server error",
            message: "Failed to calculate tutor score",
          },
          { status: 500 }
        );
      }
    } else {
      // If scores exist, recalculate using the date range if it differs from the stored score
      // For now, we'll use the latest score but filter sessions/flags by date range
      currentScore = allScores[0];
      
      // Filter performance history by date range
      performanceHistory = allScores
        .filter((score) => {
          const scoreStart = score.windowStart;
          const scoreEnd = score.windowEnd;
          // Include scores that overlap with the requested date range
          return (
            (scoreStart <= windowEnd && scoreEnd >= windowStart)
          );
        })
        .slice(0, 10);
      
      // If we have a date range and the latest score doesn't match, recalculate
      if (windowStart && windowEnd) {
        const latestScore = allScores[0];
        const scoreMatchesRange =
          latestScore.windowStart.getTime() === windowStart.getTime() &&
          latestScore.windowEnd.getTime() === windowEnd.getTime();
        
        if (!scoreMatchesRange) {
          // Recalculate score for the requested date range
          try {
            const stats: TutorStats = await getTutorStats(tutorId, windowStart, windowEnd);
            const { overallScore, confidenceScore, breakdown } = calculateAllScores(stats);
            
            const tempId = randomUUID();
            currentScore = {
              id: tempId,
              tutorId: tutorId,
              calculatedAt: windowEnd,
              windowStart: windowStart,
              windowEnd: windowEnd,
              totalSessions: stats.totalSessions,
              firstSessions: stats.firstSessions,
              noShowCount: stats.noShowCount,
              noShowRate: stats.noShowRate ? String(stats.noShowRate) : null,
              lateCount: stats.lateCount,
              lateRate: stats.lateRate ? String(stats.lateRate) : null,
              avgLatenessMinutes: stats.avgLatenessMinutes ? String(stats.avgLatenessMinutes) : null,
              earlyEndCount: stats.earlyEndCount,
              earlyEndRate: stats.earlyEndRate ? String(stats.earlyEndRate) : null,
              avgEarlyEndMinutes: stats.avgEarlyEndMinutes ? String(stats.avgEarlyEndMinutes) : null,
              rescheduleCount: stats.rescheduleCount,
              rescheduleRate: stats.rescheduleRate ? String(stats.rescheduleRate) : null,
              tutorInitiatedReschedules: stats.tutorInitiatedReschedules,
              avgStudentRating: stats.avgStudentRating ? String(stats.avgStudentRating) : null,
              avgFirstSessionRating: stats.avgFirstSessionRating ? String(stats.avgFirstSessionRating) : null,
              ratingTrend: stats.ratingTrend,
              overallScore: overallScore ? Math.round(overallScore) : null,
              confidenceScore: confidenceScore ? String(confidenceScore) : null,
              createdAt: windowEnd,
            } as typeof allScores[0];
          } catch (calcError) {
            console.error("Error recalculating score for date range:", calcError);
            // Fall back to latest score
          }
        }
      }
    }

    // Get all sessions for this tutor filtered by date range (for timeline chart aggregation)
    const sessionConditions = [eq(sessions.tutorId, tutorId)];
    if (windowStart && windowEnd) {
      sessionConditions.push(
        gte(sessions.sessionStartTime, windowStart),
        lte(sessions.sessionStartTime, windowEnd)
      );
    }
    
    const allSessions = await db
      .select()
      .from(sessions)
      .where(and(...sessionConditions))
      .orderBy(desc(sessions.sessionStartTime));

    // Get recent sessions (last 20) for the table
    const recentSessions = allSessions.slice(0, 20);

    // Get active flags (status = 'open') filtered by date range (flags created within the range)
    const flagConditions = [
      eq(flags.tutorId, tutorId),
      eq(flags.status, "open"),
    ];
    if (windowStart && windowEnd) {
      flagConditions.push(
        gte(flags.createdAt, windowStart),
        lte(flags.createdAt, windowEnd)
      );
    }
    
    const activeFlags = await db
      .select()
      .from(flags)
      .where(and(...flagConditions))
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
      session_end_time: session.sessionEndTime.toISOString(),
      tutor_join_time: session.tutorJoinTime?.toISOString() || null,
      student_join_time: session.studentJoinTime?.toISOString() || null,
      tutor_leave_time: session.tutorLeaveTime?.toISOString() || null,
      student_leave_time: session.studentLeaveTime?.toISOString() || null,
      session_length_scheduled: session.sessionLengthScheduled,
      session_length_actual: session.sessionLengthActual,
      is_first_session: session.isFirstSession,
      student_feedback_rating: session.studentFeedbackRating || null,
      tutor_feedback_rating: session.tutorFeedbackRating || null,
      student_feedback_description: session.studentFeedbackDescription || null,
      tutor_feedback_description: session.tutorFeedbackDescription || null,
      was_rescheduled: session.wasRescheduled,
      rescheduled_by: session.rescheduledBy || null,
      reschedule_count: session.rescheduleCount || 0,
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
        all_sessions: allSessions.map(transformSession), // All sessions for timeline aggregation
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

