/**
 * Debug Flagged Tutors Script
 * 
 * Checks why flagged tutors aren't showing in the dashboard.
 */

// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

async function debugFlaggedTutors() {
  // Dynamic import to ensure env vars are loaded before db module initialization
  const { db, flags, sessions } = await import("../lib/db");
  const { eq, and, gte, lte, inArray, asc } = await import("drizzle-orm");

  console.log("Debugging flagged tutors...\n");

  // Get all open flags
  const openFlags = await db
    .select()
    .from(flags)
    .where(eq(flags.status, "open"));

  const tutorIdsWithFlags = new Set(openFlags.map((f) => f.tutorId));
  console.log(`Tutors with open flags: ${tutorIdsWithFlags.size}`);
  console.log("Tutor IDs:", Array.from(tutorIdsWithFlags).join(", "));

  // Check date range (default: last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  console.log(`\nDate range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Check if tutors with flags have sessions in this date range
  const tutorIdsArray = Array.from(tutorIdsWithFlags);
  if (tutorIdsArray.length > 0) {
    const sessionsInRange = await db
      .select()
      .from(sessions)
      .where(
        and(
          inArray(sessions.tutorId, tutorIdsArray),
          gte(sessions.sessionStartTime, startDate),
          lte(sessions.sessionStartTime, endDate)
        )
      )
      .orderBy(asc(sessions.sessionStartTime));

    console.log(`\nSessions for flagged tutors in date range: ${sessionsInRange.length}`);

    // Group by tutor
    const sessionsByTutor = new Map<string, number>();
    for (const session of sessionsInRange) {
      const count = sessionsByTutor.get(session.tutorId) || 0;
      sessionsByTutor.set(session.tutorId, count + 1);
    }

    console.log("\nSessions per tutor in date range:");
    for (const tutorId of tutorIdsArray) {
      const count = sessionsByTutor.get(tutorId) || 0;
      const flagCount = openFlags.filter((f) => f.tutorId === tutorId).length;
      console.log(
        `  ${tutorId}: ${count} sessions, ${flagCount} flags ${count === 0 ? "⚠️  NO SESSIONS IN RANGE" : ""}`
      );
    }

    // Check flag creation dates
    console.log("\nFlag creation dates:");
    for (const flag of openFlags.slice(0, 5)) {
      console.log(
        `  ${flag.tutorId} - ${flag.flagType}: created ${flag.createdAt.toISOString()}`
      );
    }
  }

  // Check what getTutorSummariesFromSessions would return
  console.log("\n\nChecking what dashboard would see...");
  const allSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        gte(sessions.sessionStartTime, startDate),
        lte(sessions.sessionStartTime, endDate)
      )
    )
    .orderBy(asc(sessions.sessionStartTime));

  const sessionsByTutor = new Map<string, typeof allSessions>();
  for (const session of allSessions) {
    if (!sessionsByTutor.has(session.tutorId)) {
      sessionsByTutor.set(session.tutorId, []);
    }
    sessionsByTutor.get(session.tutorId)!.push(session);
  }

  const tutorIds = Array.from(sessionsByTutor.keys());
  const allActiveFlags = tutorIds.length > 0
    ? await db
        .select({
          tutorId: flags.tutorId,
          type: flags.flagType,
          severity: flags.severity,
          message: flags.description,
        })
        .from(flags)
        .where(
          and(
            inArray(flags.tutorId, tutorIds),
            eq(flags.status, "open"),
            gte(flags.createdAt, startDate),
            lte(flags.createdAt, endDate)
          )
        )
    : [];

  console.log(`Tutors with sessions in range: ${tutorIds.length}`);
  console.log(`Flags for those tutors: ${allActiveFlags.length}`);

  const flagsByTutor = new Map<string, Array<{ type: string; severity: string }>>();
  for (const flag of allActiveFlags) {
    if (!flagsByTutor.has(flag.tutorId)) {
      flagsByTutor.set(flag.tutorId, []);
    }
    flagsByTutor.get(flag.tutorId)!.push({
      type: flag.type,
      severity: flag.severity,
    });
  }

  console.log("\nTutors that would show in dashboard:");
  for (const [tutorId, tutorFlags] of flagsByTutor.entries()) {
    const sessionCount = sessionsByTutor.get(tutorId)?.length || 0;
    console.log(
      `  ${tutorId}: ${sessionCount} sessions, ${tutorFlags.length} flags`
    );
  }
}

// Run if executed directly
if (require.main === module) {
  debugFlaggedTutors()
    .then(() => {
      console.log("\n✅ Debug complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error debugging:", error);
      process.exit(1);
    });
}

