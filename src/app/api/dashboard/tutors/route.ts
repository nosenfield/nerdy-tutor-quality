/**
 * Dashboard Tutors API Route (Mock)
 * 
 * Returns aggregated tutor data for scatter plots.
 * This is a mock implementation for development.
 */

import { NextResponse } from "next/server";
import { generateMockTutorSummaries } from "@/lib/mock-data/dashboard";
import type { TutorSummary } from "@/lib/types/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Generate mock data (use seed for reproducibility)
    const tutors: TutorSummary[] = generateMockTutorSummaries(150, 42);

    // In a real implementation, we would filter by date range here
    // For now, return all tutors

    return NextResponse.json(tutors);
  } catch (error) {
    console.error("Error fetching tutors:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutors" },
      { status: 500 }
    );
  }
}

