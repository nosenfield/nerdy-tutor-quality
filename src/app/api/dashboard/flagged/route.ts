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
  getFlaggedTutorScores,
  transformTutorScoreToSummary,
  getTutorActiveFlags,
} from "@/lib/api/dashboard-transform";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Parse date range
    const dateRange = {
      start: startDateParam
        ? new Date(startDateParam)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
      end: endDateParam ? new Date(endDateParam) : new Date(), // Default: today
    };

    // Try to fetch from database
    try {
      const scores = await getFlaggedTutorScores(dateRange);

      if (scores.length === 0) {
        // No flagged tutors in database, fall back to mock data
        console.log("No flagged tutors found in database, using mock data");
        const allTutors = generateMockTutorSummaries(10, 42);
        const flaggedTutors = getFlaggedTutors(allTutors);
        return NextResponse.json(flaggedTutors);
      }

      // Transform scores to summaries
      const tutors = await Promise.all(
        scores.map(async (score) => {
          const activeFlags = await getTutorActiveFlags(
            score.tutorId,
            dateRange
          );
          return transformTutorScoreToSummary(score, activeFlags);
        })
      );

      return NextResponse.json(tutors);
    } catch (dbError) {
      // Database error, fall back to mock data
      console.error("Database error, falling back to mock data:", dbError);
      const allTutors = generateMockTutorSummaries(10, 42);
      const flaggedTutors = getFlaggedTutors(allTutors);
      return NextResponse.json(flaggedTutors);
    }
  } catch (error) {
    console.error("Error fetching flagged tutors:", error);
    // Final fallback to mock data
    const allTutors = generateMockTutorSummaries(10, 42);
    const flaggedTutors = getFlaggedTutors(allTutors);
    return NextResponse.json(flaggedTutors);
  }
}

