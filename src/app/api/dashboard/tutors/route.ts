/**
 * Dashboard Tutors API Route
 * 
 * Returns aggregated tutor data for scatter plots.
 * Queries tutor_scores table and transforms to TutorSummary format.
 * Falls back to mock data if database query fails.
 */

import { NextResponse } from "next/server";
import { generateMockTutorSummaries } from "@/lib/mock-data/dashboard";
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

    // Parse date range
    const dateRange = {
      start: startDateParam
        ? new Date(startDateParam)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
      end: endDateParam ? new Date(endDateParam) : new Date(), // Default: today
    };

    // Try to fetch from database
    try {
      const scores = await getLatestTutorScores(dateRange);

      if (scores.length === 0) {
        // No data in database, fall back to mock data
        console.log("No tutor scores found in database, using mock data");
        const tutors: TutorSummary[] = generateMockTutorSummaries(150, 42);
        return NextResponse.json(tutors, {
          headers: {
            "X-Data-Source": "mock",
            "X-Tutor-Count": tutors.length.toString(),
          },
        });
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
    } catch (dbError) {
      // Database error, fall back to mock data
      console.error("Database error, falling back to mock data:", dbError);
      const tutors: TutorSummary[] = generateMockTutorSummaries(150, 42);
      return NextResponse.json(tutors, {
        headers: {
          "X-Data-Source": "mock",
          "X-Tutor-Count": tutors.length.toString(),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching tutors:", error);
    // Final fallback to mock data
    const tutors: TutorSummary[] = generateMockTutorSummaries(150, 42);
    return NextResponse.json(tutors, {
      headers: {
        "X-Data-Source": "mock",
        "X-Tutor-Count": tutors.length.toString(),
      },
    });
  }
}

