/**
 * Dashboard Tutor Detail API Route
 * 
 * Returns detailed tutor information.
 * Aggregates sessions in real-time for accurate, up-to-date metrics.
 * Falls back to mock data if database query fails.
 */

import { NextResponse } from "next/server";
import {
  generateMockTutorSummaries,
  generateMockTutorDetail,
} from "@/lib/mock-data/dashboard";
import {
  getTutorSummaryFromSessions,
  getTutorActiveFlags,
} from "@/lib/api/dashboard-transform";
import type { TutorDetail } from "@/lib/types/dashboard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get("forceMock") === "true";

    // If forceMock is true, skip database and return mock data
    if (forceMock) {
      const tutors = generateMockTutorSummaries(10, 42);
      const tutor = tutors.find((t) => t.tutorId === tutorId);

      if (!tutor) {
        return NextResponse.json(
          { error: "Tutor not found" },
          { status: 404 }
        );
      }

      const tutorDetail = generateMockTutorDetail(tutor);
      return NextResponse.json(tutorDetail, {
        headers: {
          "X-Data-Source": "mock",
        },
      });
    }

    // Try to fetch from database using real-time aggregation
    try {
      // Use a wide date range to get all sessions
      const dateRange = {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end: new Date(), // today
      };

      const tutorSummary = await getTutorSummaryFromSessions(tutorId, dateRange);

      if (!tutorSummary) {
        // No data in database, fall back to mock data
        console.log(
          `No sessions found for ${tutorId}, using mock data`
        );
        const tutors = generateMockTutorSummaries(10, 42);
        const tutor = tutors.find((t) => t.tutorId === tutorId);

        if (!tutor) {
          return NextResponse.json(
            { error: "Tutor not found" },
            { status: 404 }
          );
        }

        const tutorDetail = generateMockTutorDetail(tutor);
        return NextResponse.json(tutorDetail);
      }

      // Get active flags for this tutor
      const activeFlags = await getTutorActiveFlags(tutorId, dateRange);

      // Transform summary to detail format
      const tutorDetail: TutorDetail = {
        ...tutorSummary,
        riskFlags: activeFlags.map((flag) => ({
          type: flag.type,
          severity: flag.severity as "critical" | "high" | "medium" | "low",
          message: flag.message,
        })),
      };

      return NextResponse.json(tutorDetail);
    } catch (dbError) {
      // Database error, fall back to mock data
      console.error("Database error, falling back to mock data:", dbError);
      const tutors = generateMockTutorSummaries(10, 42);
      const tutor = tutors.find((t) => t.tutorId === tutorId);

      if (!tutor) {
        return NextResponse.json(
          { error: "Tutor not found" },
          { status: 404 }
        );
      }

      const tutorDetail = generateMockTutorDetail(tutor);
      return NextResponse.json(tutorDetail);
    }
  } catch (error) {
    console.error("Error fetching tutor detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor detail" },
      { status: 500 }
    );
  }
}

