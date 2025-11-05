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

import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
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
    console.error(error instanceof Error ? error.message : String(error));
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

