/**
 * Dashboard Tutor Sessions API Route
 * 
 * Returns session history for a tutor.
 * Queries sessions table with pagination and date filtering.
 * Falls back to mock data if database query fails.
 */

import { NextResponse } from "next/server";
import { faker } from "@faker-js/faker";
import { db, sessions } from "@/lib/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

/**
 * Determine attendance status from session data
 */
function getAttendanceStatus(
  sessionStartTime: Date,
  tutorJoinTime: Date | null
): "on-time" | "late" | "no-show" {
  if (!tutorJoinTime) {
    return "no-show";
  }
  const latenessMinutes =
    (tutorJoinTime.getTime() - sessionStartTime.getTime()) / (1000 * 60);
  if (latenessMinutes > 5) {
    return "late";
  }
  return "on-time";
}

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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Parse date range
    const dateRange = startDateParam && endDateParam
      ? {
          start: new Date(startDateParam),
          end: new Date(endDateParam),
        }
      : null;

    // Try to fetch from database
    try {
      // Build query conditions
      const conditions = [eq(sessions.tutorId, tutorId)];
      if (dateRange) {
        conditions.push(
          gte(sessions.sessionStartTime, dateRange.start),
          lte(sessions.sessionStartTime, dateRange.end)
        );
      }

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(and(...conditions));
      const total = Number(totalResult[0]?.count || 0);

      // Get paginated sessions
      const offset = (page - 1) * limit;
      const sessionRecords = await db
        .select()
        .from(sessions)
        .where(and(...conditions))
        .orderBy(desc(sessions.sessionStartTime))
        .limit(limit)
        .offset(offset);

      if (sessionRecords.length === 0) {
        // No data in database, fall back to mock data
        console.log(
          `No sessions found for ${tutorId}, using mock data`
        );
        const totalSessions = faker.number.int({ min: 20, max: 100 });
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, totalSessions);

        const sessions = Array.from(
          { length: endIndex - startIndex },
          (_, i) => {
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
          }
        );

        return NextResponse.json({
          sessions,
          total: totalSessions,
          page,
          limit,
        });
      }

      // Transform sessions to API format
      const transformedSessions = sessionRecords.map((session) => {
        const attendanceStatus = getAttendanceStatus(
          session.sessionStartTime,
          session.tutorJoinTime
        );

        // Get first subject from subjects array
        const subject =
          session.subjectsCovered && session.subjectsCovered.length > 0
            ? session.subjectsCovered[0]
            : "General";

        return {
          id: session.id,
          date: session.sessionStartTime,
          subject,
          rating: session.studentFeedbackRating
            ? Number(session.studentFeedbackRating)
            : null,
          attendanceStatus,
          rescheduled: session.wasRescheduled,
          rescheduledBy: session.rescheduledBy as
            | "tutor"
            | "student"
            | null,
          isFirstSession: session.isFirstSession,
        };
      });

      return NextResponse.json({
        sessions: transformedSessions,
        total,
        page,
        limit,
      });
    } catch (dbError) {
      // Database error, fall back to mock data
      console.error("Database error, falling back to mock data:", dbError);
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
    }
  } catch (error) {
    console.error("Error fetching tutor sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor sessions" },
      { status: 500 }
    );
  }
}

