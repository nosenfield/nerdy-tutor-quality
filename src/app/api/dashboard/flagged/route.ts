/**
 * Dashboard Flagged Tutors API Route (Mock)
 * 
 * Returns list of flagged tutors for review.
 * This is a mock implementation for development.
 */

import { NextResponse } from "next/server";
import {
  generateMockTutorSummaries,
  getFlaggedTutors,
} from "@/lib/mock-data/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Generate mock data and filter for flagged tutors
    const allTutors = generateMockTutorSummaries(150, 42);
    const flaggedTutors = getFlaggedTutors(allTutors);

    // In a real implementation, we would filter by date range here
    // For now, return all flagged tutors

    return NextResponse.json(flaggedTutors);
  } catch (error) {
    console.error("Error fetching flagged tutors:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged tutors" },
      { status: 500 }
    );
  }
}

