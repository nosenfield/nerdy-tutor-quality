/**
 * Dashboard Tutor Detail API Route (Mock)
 * 
 * Returns detailed tutor information.
 * This is a mock implementation for development.
 */

import { NextResponse } from "next/server";
import {
  generateMockTutorSummaries,
  generateMockTutorDetail,
} from "@/lib/mock-data/dashboard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;

    // Generate mock data and find tutor
    const tutors = generateMockTutorSummaries(150, 42);
    const tutor = tutors.find((t) => t.tutorId === tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: "Tutor not found" },
        { status: 404 }
      );
    }

    // Generate detailed tutor information
    const tutorDetail = generateMockTutorDetail(tutor);

    return NextResponse.json(tutorDetail);
  } catch (error) {
    console.error("Error fetching tutor detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor detail" },
      { status: 500 }
    );
  }
}

