/**
 * Check Database Status
 * 
 * Script to check if the database has any data in tutor_scores and sessions tables.
 */

import { db, tutorScores, sessions } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function checkDatabase() {
  try {
    console.log("Checking database status...\n");

    // Check tutor_scores table
    const scoresResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    const scoresCount = scoresResult[0]?.count || 0;
    console.log(`Tutor Scores Count: ${scoresCount}`);

    // Check sessions table
    const sessionsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions);
    const sessionsCount = sessionsResult[0]?.count || 0;
    console.log(`Sessions Count: ${sessionsCount}`);

    // Get a sample of tutor scores
    const sampleScores = await db.select().from(tutorScores).limit(5);
    console.log(`\nSample Tutor Scores (first 5):`);
    if (sampleScores.length > 0) {
      sampleScores.forEach((score, index) => {
        console.log(
          `  ${index + 1}. Tutor ID: ${score.tutorId}, Total Sessions: ${score.totalSessions}, Window: ${score.windowStart.toISOString().split("T")[0]} to ${score.windowEnd.toISOString().split("T")[0]}`
        );
      });
    } else {
      console.log("  No tutor scores found.");
    }

    // Get a sample of sessions
    const sampleSessions = await db.select().from(sessions).limit(5);
    console.log(`\nSample Sessions (first 5):`);
    if (sampleSessions.length > 0) {
      sampleSessions.forEach((session, index) => {
        console.log(
          `  ${index + 1}. Session ID: ${session.sessionId}, Tutor ID: ${session.tutorId}, Date: ${session.sessionStartTime.toISOString().split("T")[0]}, First Session: ${session.isFirstSession}`
        );
      });
    } else {
      console.log("  No sessions found.");
    }

    console.log("\n--- Summary ---");
    if (scoresCount === 0 && sessionsCount === 0) {
      console.log("❌ Database is EMPTY - no tutor scores or sessions found.");
    } else if (scoresCount === 0) {
      console.log("⚠️  No tutor scores found, but sessions exist.");
    } else {
      console.log(`✅ Database has data: ${scoresCount} tutor scores, ${sessionsCount} sessions.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking database:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

checkDatabase();

