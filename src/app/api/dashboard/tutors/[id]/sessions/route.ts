/**
 * Dashboard Tutor Sessions API Route (Mock)
 * 
 * Returns session history for a tutor.
 * This is a mock implementation for development.
 */

import { NextResponse } from "next/server";
import { faker } from "@faker-js/faker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tutorId = id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Generate mock session data
    const totalSessions = faker.number.int({ min: 20, max: 100 });
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalSessions);

    const sessions = Array.from({ length: endIndex - startIndex }, (_, i) => {
      const sessionDate = faker.date.recent({ days: 90 });
      const isFirstSession = i === 0 && page === 1;

      return {
        id: `session_${tutorId}_${startIndex + i}`,
        date: sessionDate,
        subject: faker.helpers.arrayElement([
          "Math",
          "Science",
          "English",
          "History",
        ]),
        rating: faker.helpers.maybe(() =>
          faker.number.float({ min: 1, max: 5, fractionDigits: 1 })
        ),
        attendanceStatus: faker.helpers.arrayElement([
          "on-time",
          "late",
          "no-show",
        ]),
        rescheduled: faker.datatype.boolean({ probability: 0.2 }),
        rescheduledBy: faker.helpers.maybe(() =>
          faker.helpers.arrayElement(["tutor", "student"])
        ),
        isFirstSession,
      };
    });

    return NextResponse.json({
      sessions,
      total: totalSessions,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching tutor sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor sessions" },
      { status: 500 }
    );
  }
}

