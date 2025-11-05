import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database Client
 *
 * Creates a Drizzle ORM instance with connection pooling.
 * Uses node-postgres Pool for connection management.
 *
 * Connection pooling is handled automatically by Supabase's PgBouncer,
 * but we still use a pool for better connection management in our app.
 */

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from "./schema";

