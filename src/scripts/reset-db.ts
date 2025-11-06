// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Database Reset Script
 *
 * Clears all data from database tables for re-seeding.
 *
 * Usage: tsx src/scripts/reset-db.ts
 */

/**
 * Reset database by truncating all tables
 */
export async function resetDatabase() {
  // Dynamic import to ensure env vars are loaded before db module initialization
  const { db } = await import("../lib/db");
  const { sessions, tutorScores, flags, interventions } = await import("../lib/db/schema");

  console.log("🔄 Resetting database...");

  try {
    // Disable foreign key checks temporarily (PostgreSQL doesn't need this, but good practice)
    // Truncate tables in reverse dependency order
    console.log("   Truncating interventions...");
    await db.delete(interventions);

    console.log("   Truncating flags...");
    await db.delete(flags);

    console.log("   Truncating tutor_scores...");
    await db.delete(tutorScores);

    console.log("   Truncating sessions...");
    await db.delete(sessions);

    console.log("\n✅ Database reset complete!");
    console.log("   All tables cleared. Ready for seeding.");
  } catch (error) {
    console.error("\n❌ Error resetting database:", error);
    throw error;
  }
}

// Run if executed directly
// Note: In ESM, we check import.meta.url to determine if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  resetDatabase()
    .then(() => {
      console.log("\n🎉 Reset complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Reset failed:", error);
      process.exit(1);
    });
}
