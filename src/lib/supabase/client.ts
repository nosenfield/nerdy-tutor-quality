/**
 * Supabase Client Utilities
 * 
 * Re-exports browser client for backward compatibility.
 * 
 * For client components, use: import { createClient } from '@/lib/supabase/client-browser'
 * For server components, use: import { createServerSupabaseClient } from '@/lib/supabase/client-server'
 * 
 * Note: This file only exports the browser client to avoid bundling server-only code
 * in client components. Server components should import directly from client-server.ts
 */

// Re-export browser client (safe for client components)
export { createClient } from "./client-browser";

