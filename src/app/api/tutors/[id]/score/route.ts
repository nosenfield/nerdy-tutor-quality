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
import { db, tutorScores, flags, sessions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  calculateAttendanceScore,
  calculateRatingsScore,
  calculateCompletionScore,
  calculateReliabilityScore,
  calculateAllScores,
} from "@/lib/scoring/aggregator";
import { getTutorStats } from "@/lib/scoring/rules-engine";
import { subDays } from "date-fns";
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
    let calculatedStats: TutorStats | null = null;
    let calculatedBreakdown: {
      attendance: number;
      ratings: number;
      completion: number;
      reliability: number;
    } | null = null;

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
        calculatedStats = await getTutorStats(tutorId, windowStart, windowEnd);
        const { overallScore, confidenceScore, breakdown } = calculateAllScores(calculatedStats);
        calculatedBreakdown = breakdown;

        // Create a virtual score object for the response
        const tempId = randomUUID();
        currentScore = {
          id: tempId,
          tutorId: tutorId,
          calculatedAt: windowEnd,
          windowStart: windowStart,
          windowEnd: windowEnd,
          totalSessions: calculatedStats.totalSessions,
          firstSessions: calculatedStats.firstSessions,
          noShowCount: calculatedStats.noShowCount,
          noShowRate: calculatedStats.noShowRate ? String(calculatedStats.noShowRate) : null,
          lateCount: calculatedStats.lateCount,
          lateRate: calculatedStats.lateRate ? String(calculatedStats.lateRate) : null,
          avgLatenessMinutes: calculatedStats.avgLatenessMinutes ? String(calculatedStats.avgLatenessMinutes) : null,
          earlyEndCount: calculatedStats.earlyEndCount,
          earlyEndRate: calculatedStats.earlyEndRate ? String(calculatedStats.earlyEndRate) : null,
          avgEarlyEndMinutes: calculatedStats.avgEarlyEndMinutes ? String(calculatedStats.avgEarlyEndMinutes) : null,
          rescheduleCount: calculatedStats.rescheduleCount,
          rescheduleRate: calculatedStats.rescheduleRate ? String(calculatedStats.rescheduleRate) : null,
          tutorInitiatedReschedules: calculatedStats.tutorInitiatedReschedules,
          avgStudentRating: calculatedStats.avgStudentRating ? String(calculatedStats.avgStudentRating) : null,
          avgFirstSessionRating: calculatedStats.avgFirstSessionRating ? String(calculatedStats.avgFirstSessionRating) : null,
          ratingTrend: calculatedStats.ratingTrend,
          overallScore: overallScore ? Math.round(overallScore) : null,
          confidenceScore: confidenceScore ? String(confidenceScore) : null,
          createdAt: windowEnd,
        } as typeof allScores[0];
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
      // If scores exist, check if we need to recalculate for the date range
      const latestScore = allScores[0];
      const scoreMatchesRange =
        windowStart && windowEnd &&
        latestScore.windowStart.getTime() === windowStart.getTime() &&
        latestScore.windowEnd.getTime() === windowEnd.getTime();
      
      if (scoreMatchesRange) {
        currentScore = latestScore;
      } else {
        // Recalculate score for the requested date range
        try {
          calculatedStats = await getTutorStats(tutorId, windowStart!, windowEnd!);
          const { overallScore, confidenceScore, breakdown } = calculateAllScores(calculatedStats);
          calculatedBreakdown = breakdown;
          
          const tempId = randomUUID();
          currentScore = {
            id: tempId,
            tutorId: tutorId,
            calculatedAt: windowEnd!,
            windowStart: windowStart!,
            windowEnd: windowEnd!,
            totalSessions: calculatedStats.totalSessions,
            firstSessions: calculatedStats.firstSessions,
            noShowCount: calculatedStats.noShowCount,
            noShowRate: calculatedStats.noShowRate ? String(calculatedStats.noShowRate) : null,
            lateCount: calculatedStats.lateCount,
            lateRate: calculatedStats.lateRate ? String(calculatedStats.lateRate) : null,
            avgLatenessMinutes: calculatedStats.avgLatenessMinutes ? String(calculatedStats.avgLatenessMinutes) : null,
            earlyEndCount: calculatedStats.earlyEndCount,
            earlyEndRate: calculatedStats.earlyEndRate ? String(calculatedStats.earlyEndRate) : null,
            avgEarlyEndMinutes: calculatedStats.avgEarlyEndMinutes ? String(calculatedStats.avgEarlyEndMinutes) : null,
            rescheduleCount: calculatedStats.rescheduleCount,
            rescheduleRate: calculatedStats.rescheduleRate ? String(calculatedStats.rescheduleRate) : null,
            tutorInitiatedReschedules: calculatedStats.tutorInitiatedReschedules,
            avgStudentRating: calculatedStats.avgStudentRating ? String(calculatedStats.avgStudentRating) : null,
            avgFirstSessionRating: calculatedStats.avgFirstSessionRating ? String(calculatedStats.avgFirstSessionRating) : null,
            ratingTrend: calculatedStats.ratingTrend,
            overallScore: overallScore ? Math.round(overallScore) : null,
            confidenceScore: confidenceScore ? String(confidenceScore) : null,
            createdAt: windowEnd!,
          } as typeof allScores[0];
        } catch (calcError) {
          console.error("Error recalculating score for date range:", calcError);
          // Fall back to latest score
          currentScore = latestScore;
        }
      }
    }

    // Get active flags for this tutor filtered by date range
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

    // Calculate score breakdown
    // If we calculated on the fly, we already have the breakdown from calculateAllScores
    // Otherwise, we need to convert TutorScore to TutorStats format
    let breakdown: {
      attendance: number;
      ratings: number;
      completion: number;
      reliability: number;
    };

    if (calculatedBreakdown) {
      // We calculated on the fly, so use the breakdown we already calculated
      breakdown = calculatedBreakdown;
    } else {
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

      breakdown = {
        attendance: calculateAttendanceScore(tutorStats),
        ratings: calculateRatingsScore(tutorStats),
        completion: calculateCompletionScore(tutorStats),
        reliability: calculateReliabilityScore(tutorStats),
      };
    }

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

