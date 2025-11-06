import { db } from "../lib/db";
import { sessions, tutorScores, flags, interventions } from "../lib/db/schema";

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
if (require.main === module) {
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
