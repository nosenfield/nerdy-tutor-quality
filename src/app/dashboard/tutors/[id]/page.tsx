"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { TutorHeader } from "@/components/tutor-detail/TutorHeader";
import { ScoreBreakdown } from "@/components/tutor-detail/ScoreBreakdown";
import { PerformanceTimeline } from "@/components/tutor-detail/PerformanceTimeline";
import { ActiveFlagsList } from "@/components/tutor-detail/ActiveFlagsList";
import { RecentSessionsTable } from "@/components/tutor-detail/RecentSessionsTable";
import { InterventionsHistory } from "@/components/tutor-detail/InterventionsHistory";
import { useTutorDetailData } from "@/lib/hooks/useTutorDetailData";
import { useTutorScoreBreakdown } from "@/lib/hooks/useTutorScoreBreakdown";

/**
 * Tutor Detail Page
 * 
 * Displays comprehensive tutor information including:
 * - Tutor header with overall score
 * - Score breakdown (attendance, ratings, completion, reliability)
 * - Performance timeline chart
 * - Active flags list
 * - Recent sessions table
 * - Interventions history
 */
export default function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const tutorId = id;

  // Fetch tutor detail data
  const {
    data: tutorData,
    isLoading,
    error,
  } = useTutorDetailData(tutorId);

  // Fetch score breakdown
  const {
    data: scoreBreakdownData,
    isLoading: isLoadingBreakdown,
  } = useTutorScoreBreakdown(tutorId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">🚂 Tooter</h1>
            <LogoutButton />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tutor details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">🚂 Tooter</h1>
            <LogoutButton />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Error Loading Tutor Details
            </h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!tutorData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">🚂 Tooter</h1>
            <LogoutButton />
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Tutor Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              No data found for tutor ID: {tutorId}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { current_score, recent_sessions, active_flags, performance_history, interventions } = tutorData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">🚂 Tooter</h1>
          <LogoutButton />
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => router.push("/dashboard")}
            className="hover:text-indigo-600"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/dashboard")}
            className="hover:text-indigo-600"
          >
            Tutors
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            Tutor #{tutorId}
          </span>
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Tutor Header (Task 4.15) */}
        <TutorHeader
          tutorId={tutorId}
          currentScore={current_score}
          activeFlagsCount={active_flags?.length ?? 0}
          recentSessionsCount={recent_sessions?.length ?? 0}
        />

        {/* Score Breakdown (Task 4.16) */}
        {scoreBreakdownData && !isLoadingBreakdown && (
          <ScoreBreakdown
            breakdown={scoreBreakdownData.breakdown}
            performanceHistory={performance_history?.map((ph) => ({
              calculated_at: ph.calculated_at,
              overall_score: ph.overall_score,
            }))}
          />
        )}

        {/* Performance Timeline Chart (Task 4.17) ⭐ KEY */}
        {performance_history && performance_history.length > 0 && (
          <PerformanceTimeline
            performanceHistory={performance_history}
            activeFlags={active_flags ?? []}
            interventions={interventions ?? []}
          />
        )}

        {/* Active Flags & Interventions - Side by Side (Tasks 4.18 & 4.20) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ActiveFlagsList flags={active_flags ?? []} tutorId={tutorId} />
          <InterventionsHistory interventions={interventions ?? []} />
        </div>

        {/* Recent Sessions Table (Task 4.19) */}
        <RecentSessionsTable sessions={recent_sessions ?? []} />
      </main>
    </div>
  );
}

