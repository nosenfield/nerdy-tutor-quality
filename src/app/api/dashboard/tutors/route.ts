/**
 * Dashboard Tutors API Route
 * 
 * Returns aggregated tutor data for scatter plots.
 * Queries tutor_scores table and transforms to TutorSummary format.
 * Returns error if database query fails or no data available.
 */

import { NextResponse } from "next/server";
import { generateAlternateMockTutorSummaries } from "@/lib/mock-data/dashboard";
import type { TutorSummary } from "@/lib/types/dashboard";
import {
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

    // If forceMock is true, skip database and return alternate mock data
    // This ensures visual differences when switching between mock and live
    if (forceMock) {
      const tutors: TutorSummary[] = generateAlternateMockTutorSummaries(10, 42);
      return NextResponse.json(tutors, {
        headers: {
          "X-Data-Source": "mock",
          "X-Tutor-Count": tutors.length.toString(),
        },
      });
    }

    // Fetch from database - no fallback to mock data
    console.log("Fetching tutor scores for date range:", {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    });
    
    const scores = await getLatestTutorScores(dateRange);
    
    console.log(`Found ${scores.length} tutor scores in database`);

    if (scores.length === 0) {
      // No data in database - return error
      console.log("No tutor scores found - returning 404");
      return NextResponse.json(
        { error: "No tutor data available for the selected date range" },
        { status: 404 }
      );
    }

    // Transform scores to summaries
    const tutors: TutorSummary[] = await Promise.all(
      scores.map(async (score) => {
        const activeFlags = await getTutorActiveFlags(
          score.tutorId,
          dateRange
        );
        return transformTutorScoreToSummary(score, activeFlags);
      })
    );

    // Add metadata to indicate real data
    return NextResponse.json(tutors, {
      headers: {
        "X-Data-Source": "database",
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

