/**
 * Tutor Score Breakdown Hook
 * 
 * TanStack Query hook for fetching tutor score breakdown
 * from the /api/tutors/[id]/score endpoint.
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Type definitions for score breakdown API response
 */
export interface ScoreBreakdownResponse {
  score: {
    id: string;
    tutor_id: string;
    calculated_at: string;
    window_start: string;
    window_end: string;
    total_sessions: number;
    overall_score: number;
    confidence_score: number | null;
  };
  breakdown: {
    attendance: number; // 0-100
    ratings: number; // 0-100
    completion: number; // 0-100
    reliability: number; // 0-100
  };
  flags: Array<{
    id: string;
    tutor_id: string;
    flag_type: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    description: string;
  }>;
}

/**
 * Fetch tutor score breakdown from API
 */
async function fetchTutorScoreBreakdown(
  tutorId: string,
  dateRange?: { start: Date; end: Date }
): Promise<ScoreBreakdownResponse> {
  const url = new URL(`/api/tutors/${tutorId}/score`, window.location.origin);
  
  if (dateRange) {
    url.searchParams.set("start_date", dateRange.start.toISOString());
    url.searchParams.set("end_date", dateRange.end.toISOString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Tutor not found: ${tutorId}`);
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        errorData.error ||
        `Failed to fetch tutor score breakdown: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Hook to fetch tutor score breakdown
 */
export function useTutorScoreBreakdown(
  tutorId: string,
  dateRange?: { start: Date; end: Date }
) {
  return useQuery({
    queryKey: ["tutor-score-breakdown", tutorId, dateRange?.start.toISOString(), dateRange?.end.toISOString()],
    queryFn: () => fetchTutorScoreBreakdown(tutorId, dateRange),
    enabled: !!tutorId, // Only fetch if tutorId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Retry once on failure
  });
}

