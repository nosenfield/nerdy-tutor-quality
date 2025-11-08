// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, sessions } from "../lib/db";
import { sql } from "drizzle-orm";

async function checkRatings() {
  const results = await db
    .select({
      tutorId: sessions.tutorId,
      ratings: sql<string>`array_agg(${sessions.studentFeedbackRating} ORDER BY ${sessions.sessionStartTime})`,
      avgRating: sql<number>`ROUND(AVG(${sessions.studentFeedbackRating})::numeric, 2)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(sessions)
    .where(sql`${sessions.studentFeedbackRating} IS NOT NULL`)
    .groupBy(sessions.tutorId)
    .orderBy(sessions.tutorId);

  console.log("Tutor Ratings:");
  for (const r of results) {
    console.log(
      `  ${r.tutorId}: ${r.count} sessions, ratings: ${r.ratings}, avg: ${r.avgRating}`
    );
  }
}

checkRatings()
  .then(() => process.exit(0))
  .catch(console.error);

