/**
 * Tutor Detail Data Hook
 * 
 * TanStack Query hook for fetching comprehensive tutor detail data
 * from the /api/tutors/[id] endpoint.
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Type definitions for tutor detail API response
 */
export interface TutorDetailResponse {
  tutor_id: string;
  current_score: {
    id: string;
    tutor_id: string;
    calculated_at: string;
    window_start: string;
    window_end: string;
    total_sessions: number;
    first_sessions: number;
    no_show_count: number;
    no_show_rate: number | null;
    late_count: number;
    late_rate: number | null;
    avg_lateness_minutes: number | null;
    early_end_count: number;
    early_end_rate: number | null;
    avg_early_end_minutes: number | null;
    reschedule_count: number;
    reschedule_rate: number | null;
    tutor_initiated_reschedules: number;
    avg_student_rating: number | null;
    avg_first_session_rating: number | null;
    rating_trend: string | null;
    overall_score: number;
    confidence_score: number | null;
    created_at: string;
  };
  recent_sessions: Array<{
    session_id: string;
    tutor_id: string;
    student_id: string;
    session_start_time: string;
    session_end_time: string;
    tutor_join_time: string | null;
    student_join_time: string | null;
    tutor_leave_time: string | null;
    student_leave_time: string | null;
    session_length_scheduled: number | null;
    session_length_actual: number | null;
    is_first_session: boolean;
    student_feedback_rating: number | null;
    tutor_feedback_rating: number | null;
    student_feedback_description: string | null;
    tutor_feedback_description: string | null;
    was_rescheduled: boolean;
    rescheduled_by: string | null;
    reschedule_count: number;
    created_at: string;
    updated_at: string;
  }>;
  active_flags: Array<{
    id: string;
    tutor_id: string;
    session_id: string | null;
    flag_type: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    description: string;
    recommended_action: string | null;
    supporting_data: Record<string, unknown> | null;
    status: "open" | "resolved";
    resolved_at: string | null;
    resolved_by: string | null;
    resolution_notes: string | null;
    coach_agreed: boolean | null;
    created_at: string;
    updated_at: string;
  }>;
  performance_history: Array<{
    id: string;
    tutor_id: string;
    calculated_at: string;
    window_start: string;
    window_end: string;
    total_sessions: number;
    first_sessions: number;
    no_show_count: number;
    no_show_rate: number | null;
    late_count: number;
    late_rate: number | null;
    avg_lateness_minutes: number | null;
    early_end_count: number;
    early_end_rate: number | null;
    avg_early_end_minutes: number | null;
    reschedule_count: number;
    reschedule_rate: number | null;
    tutor_initiated_reschedules: number;
    avg_student_rating: number | null;
    avg_first_session_rating: number | null;
    rating_trend: string | null;
    overall_score: number;
    confidence_score: number | null;
    created_at: string;
  }>;
  interventions: Array<{
    id: string;
    flag_id: string | null;
    tutor_id: string;
    intervention_type: string;
    description: string;
    coach_id: string | null;
    intervention_date: string;
    follow_up_date: string | null;
    outcome: string | null;
    outcome_notes: string | null;
    created_at: string;
  }>;
}

/**
 * Fetch tutor detail data from API
 */
async function fetchTutorDetail(tutorId: string): Promise<TutorDetailResponse> {
  const response = await fetch(`/api/tutors/${tutorId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Tutor not found: ${tutorId}`);
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || errorData.error || `Failed to fetch tutor detail: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Hook to fetch comprehensive tutor detail data
 */
export function useTutorDetailData(tutorId: string) {
  return useQuery({
    queryKey: ["tutor-detail", tutorId],
    queryFn: () => fetchTutorDetail(tutorId),
    enabled: !!tutorId, // Only fetch if tutorId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Retry once on failure
  });
}

