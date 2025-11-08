/**
 * Dashboard Tutors API Route
 * 
 * Returns aggregated tutor data for scatter plots.
 * Aggregates sessions in real-time for accurate, up-to-date metrics.
 * Returns error if database query fails or no data available.
 */

import { NextResponse } from "next/server";
import { generateMockTutorSummaries } from "@/lib/mock-data/dashboard";
import type { TutorSummary } from "@/lib/types/dashboard";
import {
  getTutorSummariesFromSessions,
  getLatestTutorScores,
  transformTutorScoreToSummary,
  getTutorActiveFlags,
} from "@/lib/api/dashboard-transform";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const forceMock = searchParams.get("forceMock") === "true";

    // Parse date range
    const dateRange = {
      start: startDateParam
        ? new Date(startDateParam)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
      end: endDateParam ? new Date(endDateParam) : new Date(), // Default: today
    };

    // If forceMock is true, skip database and return mock data
    if (forceMock) {
      const tutors: TutorSummary[] = generateMockTutorSummaries(10, 42);
      return NextResponse.json(tutors, {
        headers: {
          "X-Data-Source": "mock",
          "X-Tutor-Count": tutors.length.toString(),
        },
      });
    }

    // Fetch from database using real-time session aggregation
    console.log("Aggregating sessions for date range:", {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    });
    
    const tutors = await getTutorSummariesFromSessions(dateRange);
    
    console.log(`Found ${tutors.length} tutors with sessions`);

    if (tutors.length === 0) {
      // No data in database - return error
      console.log("No tutors found - returning 404");
      return NextResponse.json(
        { error: "No tutor data available for the selected date range" },
        { status: 404 }
      );
    }

    // Add metadata to indicate real-time data
    return NextResponse.json(tutors, {
      headers: {
        "X-Data-Source": "sessions-realtime",
        "X-Tutor-Count": tutors.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching tutors:", error);
    // Return error instead of falling back to mock data
    return NextResponse.json(
      { 
        error: "Failed to fetch tutor data",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

