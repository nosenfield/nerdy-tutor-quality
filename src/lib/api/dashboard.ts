/**
 * Dashboard API Client
 * 
 * Client functions for dashboard API endpoints.
 * These functions are used by TanStack Query hooks.
 */

import type {
  DateRange,
  TutorSummary,
  TutorDetail,
  ScatterPlotDataPoint,
} from "@/lib/types/dashboard";

/**
 * Get aggregated tutor data for scatter plots
 * Returns data with metadata about data source
 */
export async function getTutors(
  dateRange: DateRange,
  forceMock: boolean = false
): Promise<{ data: TutorSummary[]; dataSource: "database" | "mock" }> {
  const params = new URLSearchParams({
    startDate: dateRange.start.toISOString().split("T")[0],
    endDate: dateRange.end.toISOString().split("T")[0],
  });

  if (forceMock) {
    params.append("forceMock", "true");
  }

  const response = await fetch(`/api/dashboard/tutors?${params.toString()}`);

  if (!response.ok) {
    // Try to read error message from response body
    let errorMessage = `Failed to fetch tutors: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If response body is not JSON, use default error message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const dataSource = forceMock
    ? "mock"
    : ((response.headers.get("X-Data-Source") as "database" | "mock") ||
        "mock");

  return { data, dataSource };
}

/**
 * Get detailed tutor information
 */
export async function getTutorDetail(tutorId: string): Promise<TutorDetail> {
  const response = await fetch(`/api/dashboard/tutors/${tutorId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tutor detail: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get tutor session history
 */
export async function getTutorSessions(
  tutorId: string,
  dateRange?: DateRange,
  page: number = 1,
  limit: number = 50
): Promise<{
  sessions: Array<{
    id: string;
    date: Date;
    subject: string;
    rating: number | null;
    attendanceStatus: "on-time" | "late" | "no-show";
    rescheduled: boolean;
    rescheduledBy: "tutor" | "student" | null;
    isFirstSession: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (dateRange) {
    params.append("startDate", dateRange.start.toISOString().split("T")[0]);
    params.append("endDate", dateRange.end.toISOString().split("T")[0]);
  }

  const response = await fetch(
    `/api/dashboard/tutors/${tutorId}/sessions?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch tutor sessions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get list of flagged tutors
 */
export async function getFlaggedTutors(
  dateRange: DateRange
): Promise<TutorSummary[]> {
  const params = new URLSearchParams({
    startDate: dateRange.start.toISOString().split("T")[0],
    endDate: dateRange.end.toISOString().split("T")[0],
  });

  const response = await fetch(`/api/dashboard/flagged?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch flagged tutors: ${response.statusText}`);
  }

  return response.json();
}

