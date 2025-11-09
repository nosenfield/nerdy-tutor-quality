/**
 * Queue Monitoring API Route
 * 
 * Serves Bull Board UI for monitoring queue status and jobs.
 * Provides a web interface for viewing queue metrics, job history, and status.
 * 
 * Access at: /api/admin/queue
 * 
 * Note: Full Bull Board UI requires custom server setup. This endpoint
 * currently returns a redirect to the status endpoint.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Handle GET requests - serve Bull Board UI
 * 
 * Note: Bull Board Express adapter requires Express server setup.
 * For Next.js App Router, use /api/admin/queue/status for JSON status.
 */
export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    
    // Bull Board expects Express-style request/response
    // Full Bull Board UI integration requires custom server setup
    // For now, redirect to status endpoint or return info
    
    return NextResponse.json({
      message: "Queue monitoring endpoint",
      path: pathname,
      note: "Bull Board UI requires custom server setup. Use /api/admin/queue/status for queue metrics.",
      statusEndpoint: "/api/admin/queue/status",
    });
  } catch (error) {
    console.error("Error in queue monitoring route:", error);
    return NextResponse.json(
      { error: "Failed to load queue monitoring" },
      { status: 500 }
    );
  }
}

