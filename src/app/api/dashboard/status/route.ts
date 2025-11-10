import { NextResponse } from "next/server";
import { db, tutorScores, sessions } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Database Status Check
 * Returns counts of tutor_scores and sessions tables
 */
export async function GET() {
  try {
    // Check tutor_scores
    const scoresCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorScores);
    
    // Check sessions
    const sessionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions);
    
    const tutorScoresCount = scoresCount[0]?.count || 0;
    const sessionsTableCount = sessionsCount[0]?.count || 0;
    
    return NextResponse.json({
      tutor_scores: tutorScoresCount,
      sessions: sessionsTableCount,
      isEmpty: tutorScoresCount === 0 && sessionsTableCount === 0,
    });
  } catch (error) {
    console.error("Error checking database status:", error);
    return NextResponse.json(
      {
        error: "Failed to check database status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

