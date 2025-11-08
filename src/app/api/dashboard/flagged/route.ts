/**
 * Dashboard Flagged Tutors API Route
 * 
 * Returns list of flagged tutors for review.
 * Queries flags table and gets tutor scores for flagged tutors.
 * Falls back to mock data if database query fails.
 */

import { NextResponse } from "next/server";
import {
  generateMockTutorSummaries,
  getFlaggedTutors,
} from "@/lib/mock-data/dashboard";
import {
  getTutorSummariesFromSessions,
  getFlaggedTutorScores,
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
      const mockTutors = generateMockTutorSummaries(10, 42);
      const flaggedTutors = getFlaggedTutors(mockTutors);
      return NextResponse.json(flaggedTutors, {
        headers: {
          "X-Data-Source": "mock",
          "X-Flagged-Count": flaggedTutors.length.toString(),
        },
      });
    }

    // Try to fetch from database using real-time aggregation
    try {
      const allTutors = await getTutorSummariesFromSessions(dateRange);

      if (allTutors.length === 0) {
        // No tutors in database, return empty array
        console.log("No tutors found in database");
        return NextResponse.json([], {
          headers: {
            "X-Data-Source": "sessions-realtime",
            "X-Flagged-Count": "0",
          },
        });
      }

      // Filter to only tutors with flags
      const flaggedTutors = allTutors.filter(
        (tutor) => tutor.riskFlags.length > 0
      );

      return NextResponse.json(flaggedTutors, {
        headers: {
          "X-Data-Source": "sessions-realtime",
          "X-Flagged-Count": flaggedTutors.length.toString(),
        },
      });
    } catch (dbError) {
      // Database error, return empty array (don't fall back to mock)
      console.error("Database error:", dbError);
      return NextResponse.json(
        { 
          error: "Failed to fetch flagged tutors",
          message: dbError instanceof Error ? dbError.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching flagged tutors:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch flagged tutors",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

