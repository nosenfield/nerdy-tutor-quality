/**
 * Tutor Score API Endpoint
 * 
 * GET /api/tutors/[id]/score - Get current tutor score with breakdown
 * 
 * Returns:
 * {
 *   score: TutorScore,
 *   breakdown: {
 *     attendance: number,    // 0-100
 *     ratings: number,        // 0-100
 *     completion: number,    // 0-100
 *     reliability: number    // 0-100
 *   },
 *   flags: Flag[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tutorScores, flags } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  calculateAttendanceScore,
  calculateRatingsScore,
  calculateCompletionScore,
  calculateReliabilityScore,
} from "@/lib/scoring/aggregator";
import type { TutorStats } from "@/lib/scoring/rules-engine";

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

    // Get active flags for this tutor
    const activeFlags = await db
      .select()
      .from(flags)
      .where(and(eq(flags.tutorId, tutorId), eq(flags.status, "open")))
      .orderBy(desc(flags.createdAt));

    // Convert TutorScore to TutorStats format for score calculation
    const tutorStats: TutorStats = {
      totalSessions: currentScore.totalSessions,
      firstSessions: currentScore.firstSessions,
      noShowCount: currentScore.noShowCount,
      noShowRate: currentScore.noShowRate ? Number(currentScore.noShowRate) : null,
      lateCount: currentScore.lateCount,
      lateRate: currentScore.lateRate ? Number(currentScore.lateRate) : null,
      avgLatenessMinutes: currentScore.avgLatenessMinutes ? Number(currentScore.avgLatenessMinutes) : null,
      earlyEndCount: currentScore.earlyEndCount,
      earlyEndRate: currentScore.earlyEndRate ? Number(currentScore.earlyEndRate) : null,
      avgEarlyEndMinutes: currentScore.avgEarlyEndMinutes ? Number(currentScore.avgEarlyEndMinutes) : null,
      rescheduleCount: currentScore.rescheduleCount,
      rescheduleRate: currentScore.rescheduleRate ? Number(currentScore.rescheduleRate) : null,
      tutorInitiatedReschedules: currentScore.tutorInitiatedReschedules,
      avgStudentRating: currentScore.avgStudentRating ? Number(currentScore.avgStudentRating) : null,
      avgFirstSessionRating: currentScore.avgFirstSessionRating ? Number(currentScore.avgFirstSessionRating) : null,
      ratingTrend: currentScore.ratingTrend as "improving" | "stable" | "declining" | null,
    };

    // Calculate score breakdown
    const breakdown = {
      attendance: calculateAttendanceScore(tutorStats),
      ratings: calculateRatingsScore(tutorStats),
      completion: calculateCompletionScore(tutorStats),
      reliability: calculateReliabilityScore(tutorStats),
    };

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

    return NextResponse.json(
      {
        score: transformScore(currentScore),
        breakdown,
        flags: activeFlags.map(transformFlag),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tutor score:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch tutor score",
      },
      { status: 500 }
    );
  }
}

