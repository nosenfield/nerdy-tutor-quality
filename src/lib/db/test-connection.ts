#!/usr/bin/env node
/**
 * Database Connection Test Script
 *
 * Tests database connection by running a simple SELECT query.
 *
 * Usage:
 *   pnpm test:db
 *
 * Requires DATABASE_URL environment variable to be set.
 */

// IMPORTANT: Load environment variables BEFORE any imports
// We must use dynamic imports to ensure env vars are loaded first
import { config } from "dotenv";
config({ path: ".env.local" });

async function testConnection() {
  try {
    // Dynamic import to ensure env vars are loaded before db module initialization
    const { db } = await import("./index.js");
    const { sql } = await import("drizzle-orm");

    console.log("Testing database connection...");

    // Simple SELECT query to test connection
    const result = await db.execute(sql`SELECT 1 as test`);

    if (result.rows && result.rows.length > 0) {
      console.log("✅ Database connection successful!");
      console.log(`   Query result: ${JSON.stringify(result.rows[0])}`);
      return true;
    } else {
      console.error("❌ Database connection failed: No result returned");
      return false;
    }
  } catch (error) {
    console.error("❌ Database connection failed:");
    if (error instanceof Error) {
      console.error(error.message);
      // Check if error has a cause (common in Drizzle ORM errors)
      if ('cause' in error && error.cause) {
        console.error("\nUnderlying cause:");
        console.error(error.cause);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run test
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });

export { testConnection };

