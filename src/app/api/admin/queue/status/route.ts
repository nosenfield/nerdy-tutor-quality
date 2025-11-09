/**
 * Queue Status API Route
 * 
 * Returns queue metrics and status as JSON.
 * Provides programmatic access to queue information.
 */

import { NextResponse } from "next/server";
import { getQueueStatusSummary } from "@/lib/queue/monitoring";

/**
 * Handle GET requests - return queue status
 */
export async function GET() {
  try {
    const status = await getQueueStatusSummary();
    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRedisError = 
      errorMessage.includes("REDIS_URL") || 
      errorMessage.includes("Redis") ||
      errorMessage.includes("ECONNREFUSED");
    
    return NextResponse.json(
      { 
        error: "Failed to fetch queue status",
        details: isRedisError 
          ? "Redis connection error. Please ensure REDIS_URL is set in .env.local"
          : errorMessage,
        hint: !process.env.REDIS_URL 
          ? "REDIS_URL environment variable is not set"
          : undefined,
      },
      { status: 500 }
    );
  }
}

