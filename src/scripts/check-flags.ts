/**
 * Check Flags Script
 * 
 * Checks if flags exist in the database and displays them.
 */

// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

async function checkFlags() {
  // Dynamic import to ensure env vars are loaded before db module initialization
  const { db, flags } = await import("../lib/db");
  const { eq, gte, lte, and, desc } = await import("drizzle-orm");

  console.log("Checking flags in database...\n");

  // Get all flags
  const allFlags = await db.select().from(flags).orderBy(desc(flags.createdAt)).limit(20);
  console.log(`Total flags in database: ${allFlags.length}`);

  if (allFlags.length > 0) {
    console.log("\nRecent flags:");
    allFlags.forEach((flag, index) => {
      console.log(
        `${index + 1}. Flag ID: ${flag.id.substring(0, 8)}...`
      );
      console.log(`   Tutor: ${flag.tutorId}`);
      console.log(`   Type: ${flag.flagType}`);
      console.log(`   Severity: ${flag.severity}`);
      console.log(`   Status: ${flag.status}`);
      console.log(`   Created: ${flag.createdAt.toISOString()}`);
      console.log(`   Title: ${flag.title}`);
      console.log("");
    });
  }

  // Get open flags
  const openFlags = await db
    .select()
    .from(flags)
    .where(eq(flags.status, "open"))
    .orderBy(desc(flags.createdAt))
    .limit(20);

  console.log(`Open flags: ${openFlags.length}`);

  // Get flags by status
  const flagsByStatus = await db
    .select()
    .from(flags);

  const statusCounts = flagsByStatus.reduce((acc, flag) => {
    acc[flag.status] = (acc[flag.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nFlags by status:");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Get flags by type
  const flagsByType = await db
    .select()
    .from(flags);

  const typeCounts = flagsByType.reduce((acc, flag) => {
    acc[flag.flagType] = (acc[flag.flagType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nFlags by type:");
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Check date range filtering (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date();

  const flagsInRange = await db
    .select()
    .from(flags)
    .where(
      and(
        eq(flags.status, "open"),
        gte(flags.createdAt, thirtyDaysAgo),
        lte(flags.createdAt, now)
      )
    );

  console.log(`\nOpen flags in last 30 days: ${flagsInRange.length}`);

  // Get unique tutor IDs with flags
  const tutorsWithFlags = await db
    .select({ tutorId: flags.tutorId })
    .from(flags)
    .where(eq(flags.status, "open"));

  const uniqueTutorIds = new Set(tutorsWithFlags.map((f) => f.tutorId));
  console.log(`\nUnique tutors with open flags: ${uniqueTutorIds.size}`);
  if (uniqueTutorIds.size > 0) {
    console.log("Tutor IDs:", Array.from(uniqueTutorIds).slice(0, 10).join(", "));
  }
}

// Run if executed directly
if (require.main === module) {
  checkFlags()
    .then(() => {
      console.log("\n✅ Check complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error checking flags:", error);
      process.exit(1);
    });
}

