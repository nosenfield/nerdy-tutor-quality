/**
 * Dashboard Tutor Detail API Route
 * 
 * Returns detailed tutor information.
 * Queries tutor_scores and flags tables, transforms to TutorDetail format.
 * Falls back to mock data if database query fails.
 */

import { NextResponse } from "next/server";
import {
  generateMockTutorSummaries,
  generateMockTutorDetail,
} from "@/lib/mock-data/dashboard";
import { db, tutorScores } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import {
  transformTutorScoreToDetail,
  getTutorActiveFlags,
} from "@/lib/api/dashboard-transform";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;

    // Try to fetch from database
    try {
      // Get the most recent score for this tutor
      const scores = await db
        .select()
        .from(tutorScores)
        .where(eq(tutorScores.tutorId, tutorId))
        .orderBy(desc(tutorScores.calculatedAt))
        .limit(1);

      if (scores.length === 0) {
        // No data in database, fall back to mock data
        console.log(
          `No tutor score found for ${tutorId}, using mock data`
        );
        const tutors = generateMockTutorSummaries(150, 42);
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

      const score = scores[0];

      // Get active flags for this tutor
      // Use a wide date range to get all active flags
      const dateRange = {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        end: new Date(), // today
      };
      const activeFlags = await getTutorActiveFlags(tutorId, dateRange);

      // Transform to detail format
      const tutorDetail = transformTutorScoreToDetail(score, activeFlags);

      return NextResponse.json(tutorDetail);
    } catch (dbError) {
      // Database error, fall back to mock data
      console.error("Database error, falling back to mock data:", dbError);
      const tutors = generateMockTutorSummaries(150, 42);
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

