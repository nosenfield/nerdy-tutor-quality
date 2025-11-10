import { NextResponse } from "next/server";
import { db, tutorScores, sessions } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTutorStats } from "@/lib/scoring/rules-engine";
import { calculateAllScores } from "@/lib/scoring/aggregator";
import type { TutorScoreInsert } from "@/lib/types/tutor";
import { subDays } from "date-fns";

/**
 * Calculate Tutor Scores API Endpoint
 * 
 * Calculates and inserts tutor_scores from sessions data.
 * This endpoint should be called after seeding sessions data.
 */
export async function POST() {
  try {
    console.log("📊 Starting tutor score calculation via API...");

    // Get all unique tutor IDs from sessions
    const tutorIdsResult = await db
      .selectDistinct({ tutorId: sessions.tutorId })
      .from(sessions);

    const tutorIds = tutorIdsResult.map((r) => r.tutorId);
    console.log(`   Found ${tutorIds.length} tutors with sessions`);

    if (tutorIds.length === 0) {
      return NextResponse.json(
        { error: "No tutors found. Please seed sessions data first." },
        { status: 400 }
      );
    }

    // Define time window (last 30 days)
    const windowEnd = new Date();
    const windowStart = subDays(windowEnd, 30);

    console.log(`   Time window: ${windowStart.toISOString().split("T")[0]} to ${windowEnd.toISOString().split("T")[0]}`);

    // Calculate scores for each tutor
    const scoresToInsert: TutorScoreInsert[] = [];
    let processed = 0;
    const errors: string[] = [];

    for (const tutorId of tutorIdsResult) {
      try {
        // Get tutor stats
        const stats = await getTutorStats(
          tutorId.tutorId,
          windowStart,
          windowEnd
        );

        // Skip tutors with no sessions
        if (stats.totalSessions === 0) {
          continue;
        }

        // Calculate scores
        const { overallScore, confidenceScore } = calculateAllScores(stats);

        // Build score record
        const score: TutorScoreInsert = {
          tutorId: stats.tutorId,
          windowStart: stats.windowStart,
          windowEnd: stats.windowEnd,
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
        };

        scoresToInsert.push(score);
        processed++;

        if (processed % 10 === 0) {
          console.log(`   Processed ${processed}/${tutorIds.length} tutors...`);
        }
      } catch (error) {
        const errorMsg = `Error processing tutor ${tutorId.tutorId}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`   ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }
    }

    console.log(`\n💾 Inserting ${scoresToInsert.length} tutor scores...`);

    // Insert scores in batches
    const batchSize = 50;
    for (let i = 0; i < scoresToInsert.length; i += batchSize) {
      const batch = scoresToInsert.slice(i, i + batchSize);
      await db.insert(tutorScores).values(batch);
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scoresToInsert.length / batchSize)}`);
    }

    // Verify insertion
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    const count = countResult[0]?.count || 0;

    console.log("\n✅ Tutor scores calculated and inserted successfully!");
    console.log(`   Total scores: ${scoresToInsert.length}`);
    console.log(`   Verified: ${count} scores in database`);

    return NextResponse.json({
      success: true,
      tutorsProcessed: processed,
      scoresInserted: scoresToInsert.length,
      totalScoresInDatabase: count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("\n❌ Error calculating scores:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate scores",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

