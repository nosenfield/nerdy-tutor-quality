/**
 * Process Sessions Script
 * 
 * Backfills flags for existing sessions in the database.
 * Processes all sessions or sessions within a date range.
 */

import "dotenv/config";
import { db, sessions } from "@/lib/db";
import { processSession, processSessions } from "@/lib/queue/process-session";
import { gte, lte, asc, and } from "drizzle-orm";

/**
 * Process all sessions in the database
 */
async function processAllSessions(): Promise<void> {
  console.log("Fetching all sessions from database...");

  const allSessions = await db
    .select()
    .from(sessions)
    .orderBy(asc(sessions.sessionStartTime));

  console.log(`Found ${allSessions.length} sessions to process`);

  const sessionIds = allSessions.map((s) => s.sessionId);
  const results = await processSessions(sessionIds);

  let totalFlags = 0;
  let processedCount = 0;
  let errorCount = 0;

  for (const [sessionId, flagIds] of results.entries()) {
    if (flagIds.length > 0) {
      totalFlags += flagIds.length;
      processedCount++;
    } else {
      errorCount++;
    }
  }

  console.log("\n=== Processing Complete ===");
  console.log(`Total sessions: ${allSessions.length}`);
  console.log(`Processed successfully: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total flags created: ${totalFlags}`);
}

/**
 * Process sessions within a date range
 */
async function processSessionsInRange(
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log(
    `Fetching sessions from ${startDate.toISOString()} to ${endDate.toISOString()}...`
  );

  const sessionsInRange = await db
    .select()
    .from(sessions)
    .where(
      and(
        gte(sessions.sessionStartTime, startDate),
        lte(sessions.sessionStartTime, endDate)
      )
    )
    .orderBy(asc(sessions.sessionStartTime));

  console.log(`Found ${sessionsInRange.length} sessions to process`);

  const sessionIds = sessionsInRange.map((s) => s.sessionId);
  const results = await processSessions(sessionIds);

  let totalFlags = 0;
  let processedCount = 0;
  let errorCount = 0;

  for (const [sessionId, flagIds] of results.entries()) {
    if (flagIds.length > 0) {
      totalFlags += flagIds.length;
      processedCount++;
    } else {
      errorCount++;
    }
  }

  console.log("\n=== Processing Complete ===");
  console.log(`Total sessions: ${sessionsInRange.length}`);
  console.log(`Processed successfully: ${processedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total flags created: ${totalFlags}`);
}

/**
 * Main function
 */
async function main() {
  try {
    // Check for date range arguments
    const args = process.argv.slice(2);
    if (args.length === 2) {
      const startDate = new Date(args[0]);
      const endDate = new Date(args[1]);
      await processSessionsInRange(startDate, endDate);
    } else {
      // Process all sessions
      await processAllSessions();
    }
  } catch (error) {
    console.error("Error processing sessions:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

