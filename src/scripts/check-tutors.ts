/**
 * Check Tutors Script
 * 
 * Checks how many tutors and sessions are in the database.
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function checkTutors() {
  try {
    console.log("Checking database...\n");

    // Count distinct tutors
    const tutorCount = await db.execute(
      sql`SELECT COUNT(DISTINCT tutor_id) as tutor_count FROM sessions`
    );
    console.log(
      `Total tutors in sessions table: ${tutorCount.rows[0]?.tutor_count || 0}`
    );

    // Get sample tutor IDs
    const sampleTutors = await db.execute(
      sql`SELECT DISTINCT tutor_id FROM sessions LIMIT 10`
    );
    console.log(
      `Sample tutor IDs: ${sampleTutors.rows.map((r) => r.tutor_id).join(", ")}`
    );

    // Count total sessions
    const sessionCount = await db.execute(
      sql`SELECT COUNT(*) as session_count FROM sessions`
    );
    console.log(
      `Total sessions: ${sessionCount.rows[0]?.session_count || 0}`
    );

    // Get date range of sessions
    const dateRange = await db.execute(
      sql`SELECT MIN(session_start_time) as earliest, MAX(session_start_time) as latest FROM sessions`
    );
    const earliest = dateRange.rows[0]?.earliest;
    const latest = dateRange.rows[0]?.latest;
    console.log(`Earliest session: ${earliest}`);
    console.log(`Latest session: ${latest}`);

    // Count sessions in last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const sessionsLastMonth = await db.execute(
      sql`SELECT COUNT(DISTINCT tutor_id) as tutor_count FROM sessions WHERE session_start_time >= ${lastMonth.toISOString()}`
    );
    console.log(
      `\nTutors with sessions in last month: ${sessionsLastMonth.rows[0]?.tutor_count || 0}`
    );

    // Count sessions in last month
    const sessionsLastMonthCount = await db.execute(
      sql`SELECT COUNT(*) as session_count FROM sessions WHERE session_start_time >= ${lastMonth.toISOString()}`
    );
    console.log(
      `Sessions in last month: ${sessionsLastMonthCount.rows[0]?.session_count || 0}`
    );

    process.exit(0);
  } catch (error) {
    console.error("Error checking tutors:", error);
    process.exit(1);
  }
}

checkTutors();

