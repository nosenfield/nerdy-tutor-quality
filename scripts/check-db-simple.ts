import { db, tutorScores, sessions } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    // Check tutor_scores
    const scoresCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    
    // Check sessions
    const sessionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions);
    
    console.log("Database Status:");
    console.log(`  tutor_scores: ${scoresCount[0]?.count || 0} records`);
    console.log(`  sessions: ${sessionsCount[0]?.count || 0} records`);
    
    if ((scoresCount[0]?.count || 0) === 0 && (sessionsCount[0]?.count || 0) === 0) {
      console.log("\n❌ Database is EMPTY");
    } else {
      console.log("\n✅ Database has data");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

check();

