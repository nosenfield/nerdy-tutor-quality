/**
 * Calculate Tutor Scores
 * 
 * Calculates and inserts tutor_scores from sessions data.
 * This script should be run after seeding sessions data.
 * 
 * Usage: tsx src/scripts/calculate-scores.ts
 */

// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import type { TutorScoreInsert } from "../lib/types/tutor";
import { subDays } from "date-fns";

/**
 * Calculate and insert tutor scores for all tutors
 */
async function calculateScores() {
  try {
    console.log("📊 Starting tutor score calculation...");

    // Dynamic imports to ensure env vars are loaded before db module initialization
    // This prevents hoisting issues where db connection is created before env vars are available
    const dbModule = await import("../lib/db");
    const db = dbModule.db;
    const { tutorScores, sessions } = await import("../lib/db/schema");
    const rulesEngineModule = await import("../lib/scoring/rules-engine");
    const { getTutorStats } = rulesEngineModule;
    type TutorStats = Awaited<ReturnType<typeof getTutorStats>>;
    const { calculateAllScores } = await import("../lib/scoring/aggregator");

    // Get all unique tutor IDs from sessions
    const tutorIdsResult = await db
      .selectDistinct({ tutorId: sessions.tutorId })
      .from(sessions);

    const tutorIds = tutorIdsResult.map((r) => r.tutorId);
    console.log(`   Found ${tutorIds.length} tutors with sessions`);

    if (tutorIds.length === 0) {
      console.log("⚠️  No tutors found. Please seed sessions data first.");
      return;
    }

    // Define time window (last 30 days)
    const windowEnd = new Date();
    const windowStart = subDays(windowEnd, 30);

    console.log(`   Time window: ${windowStart.toISOString().split("T")[0]} to ${windowEnd.toISOString().split("T")[0]}`);

    // Calculate scores for each tutor
    const scoresToInsert: TutorScoreInsert[] = [];
    let processed = 0;
    let errors = 0;

    for (const tutorId of tutorIds) {
      try {
        // Get tutor stats with retry logic
        let stats: TutorStats | undefined;
        let retries = 3;
        while (retries > 0) {
          try {
            stats = await getTutorStats(
              tutorId,
              windowStart,
              windowEnd
            );
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * (3 - retries)));
          }
        }

        // Skip tutors with no sessions or if stats is undefined
        if (!stats || stats.totalSessions === 0) {
          continue;
        }

        // Calculate scores
        const { overallScore, confidenceScore, breakdown } = calculateAllScores(stats);

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
          console.log(`   Processed ${processed}/${tutorIds.length} tutors... (${errors} errors)`);
        }

        // Small delay to avoid overwhelming the connection pool
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        errors++;
        console.error(`   Error processing tutor ${tutorId}:`, error instanceof Error ? error.message : error);
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

    console.log("\n✅ Tutor scores calculated and inserted successfully!");
    console.log(`   Total scores: ${scoresToInsert.length}`);

    // Verify insertion
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    const count = countResult[0]?.count || 0;
    console.log(`   Verified: ${count} scores in database`);
  } catch (error) {
    console.error("\n❌ Error calculating scores:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      if ('cause' in error && error.cause) {
        console.error("Cause:", error.cause);
      }
    }
    throw error;
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  calculateScores()
    .then(() => {
      console.log("\n🎉 Score calculation complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Score calculation failed:", error);
      process.exit(1);
    });
}

