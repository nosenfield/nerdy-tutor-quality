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
    // For end date, if only date is provided (YYYY-MM-DD), set to end of day (23:59:59.999)
    // This ensures flags/sessions created on that day are included
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    if (endDateParam && !endDateParam.includes("T")) {
      // Date only format (YYYY-MM-DD), set to end of day
      endDate.setHours(23, 59, 59, 999);
    }
    
    const dateRange = {
      start: startDateParam
        ? new Date(startDateParam)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
      end: endDate,
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
      // First, get all tutors with open flags created within the date range
      // This respects the date range filter for flags
      const { db, flags } = await import("@/lib/db");
      const { eq, and, gte, lte } = await import("drizzle-orm");

      const tutorsWithFlags = await db
        .selectDistinct({ tutorId: flags.tutorId })
        .from(flags)
        .where(
          and(
            eq(flags.status, "open"),
            gte(flags.createdAt, dateRange.start),
            lte(flags.createdAt, dateRange.end)
          )
        );

      if (tutorsWithFlags.length === 0) {
        console.log("No tutors with open flags found");
        return NextResponse.json([], {
          headers: {
            "X-Data-Source": "sessions-realtime",
            "X-Flagged-Count": "0",
          },
        });
      }

      const flaggedTutorIds = tutorsWithFlags.map((f) => f.tutorId);
      console.log(`Found ${flaggedTutorIds.length} tutors with open flags`);

      // Get tutor summaries for flagged tutors (this will include their sessions in date range)
      const allTutors = await getTutorSummariesFromSessions(dateRange);

      // Filter to only tutors with flags
      // Note: getTutorSummariesFromSessions only includes tutors with sessions in date range,
      // so we need to also check if flagged tutors have sessions in range
      const flaggedTutors = allTutors.filter(
        (tutor) => tutor.riskFlags.length > 0 && flaggedTutorIds.includes(tutor.tutorId)
      );

      console.log(`Found ${flaggedTutors.length} flagged tutors with sessions in date range`);

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

