/**
 * Vitest Setup File
 *
 * Loads environment variables before any tests run.
 * This ensures DATABASE_URL and other env vars are available
 * when database connections are initialized.
 */

import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL not found in environment. Make sure .env.local exists and contains DATABASE_URL."
  );
}
