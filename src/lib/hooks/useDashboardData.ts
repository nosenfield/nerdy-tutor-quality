/**
 * Dashboard Data Hooks
 * 
 * TanStack Query hooks for fetching dashboard data.
 * All hooks include proper error handling and loading states.
 */

import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/lib/types/dashboard";
import {
  getTutors,
  getTutorDetail,
  getTutorSessions,
  getFlaggedTutors,
} from "@/lib/api/dashboard";

/**
 * Query key factory for dashboard queries
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  tutors: (dateRange: DateRange) =>
    [...dashboardKeys.all, "tutors", dateRange] as const,
  tutorDetail: (tutorId: string) =>
    [...dashboardKeys.all, "tutor", tutorId] as const,
  tutorSessions: (
    tutorId: string,
    dateRange?: DateRange,
    page?: number,
    limit?: number
  ) =>
    [
      ...dashboardKeys.all,
      "tutor",
      tutorId,
      "sessions",
      dateRange,
      page,
      limit,
    ] as const,
  flagged: (dateRange: DateRange) =>
    [...dashboardKeys.all, "flagged", dateRange] as const,
};

/**
 * Hook to fetch tutor sessions data for scatter plots
 */
export function useTutorSessions(
  dateRange: DateRange,
  forceMock: boolean = false
) {
  return useQuery({
    queryKey: [...dashboardKeys.tutors(dateRange), forceMock],
    queryFn: () => getTutors(dateRange, forceMock),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch tutor scores (alias for useTutorSessions)
 */
export function useTutorScores(dateRange: DateRange) {
  return useTutorSessions(dateRange);
}

/**
 * Hook to fetch flagged tutors
 */
export function useFlaggedTutors(dateRange: DateRange) {
  return useQuery({
    queryKey: dashboardKeys.flagged(dateRange),
    queryFn: () => getFlaggedTutors(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch detailed tutor information
 */
export function useTutorDetail(tutorId: string) {
  return useQuery({
    queryKey: dashboardKeys.tutorDetail(tutorId),
    queryFn: () => getTutorDetail(tutorId),
    enabled: !!tutorId, // Only fetch if tutorId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch tutor session history
 */
export function useTutorSessionHistory(
  tutorId: string,
  dateRange?: DateRange,
  page: number = 1,
  limit: number = 50
) {
  return useQuery({
    queryKey: dashboardKeys.tutorSessions(tutorId, dateRange, page, limit),
    queryFn: () => getTutorSessions(tutorId, dateRange, page, limit),
    enabled: !!tutorId, // Only fetch if tutorId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

