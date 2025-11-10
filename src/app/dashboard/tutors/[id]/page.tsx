"use client";

import { use, useState, useEffect, useMemo } from "react";
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
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import { Switch, Listbox, Transition, RadioGroup } from "@headlessui/react";
import { RefreshCw, Check, ChevronsUpDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, subDays, subMonths, subQuarters, startOfToday, endOfToday } from "date-fns";
import { Fragment } from "react";
import type { DateRange } from "@/lib/types/dashboard";

/**
 * Quick filter options for date range
 */
type QuickFilter = "today" | "last-week" | "last-month" | "last-quarter" | "all-time";

const QUICK_FILTERS = [
  {
    id: "today" as QuickFilter,
    label: "Today",
    getDateRange: () => ({
      start: startOfToday(),
      end: endOfToday(),
    }),
  },
  {
    id: "last-week" as QuickFilter,
    label: "Last Week",
    getDateRange: () => ({
      start: subDays(startOfToday(), 7),
      end: endOfToday(),
    }),
  },
  {
    id: "last-month" as QuickFilter,
    label: "Last Month",
    getDateRange: () => ({
      start: subMonths(startOfToday(), 1),
      end: endOfToday(),
    }),
  },
  {
    id: "last-quarter" as QuickFilter,
    label: "Last Quarter",
    getDateRange: () => ({
      start: subQuarters(startOfToday(), 1),
      end: endOfToday(),
    }),
  },
  {
    id: "all-time" as QuickFilter,
    label: "All Time",
    getDateRange: () => ({
      start: new Date(2020, 0, 1),
      end: endOfToday(),
    }),
  },
];

/**
 * Get current quick filter based on date range
 */
function getCurrentQuickFilter(dateRange: DateRange): QuickFilter {
  const today = startOfToday();
  const endOfDay = endOfToday();
  const lastWeek = subDays(today, 7);
  const lastMonth = subMonths(today, 1);
  const lastQuarter = subQuarters(today, 1);

  if (
    dateRange.start.getTime() === today.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "today";
  }
  if (
    dateRange.start.getTime() === lastWeek.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-week";
  }
  if (
    dateRange.start.getTime() === lastMonth.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-month";
  }
  if (
    dateRange.start.getTime() === lastQuarter.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-quarter";
  }

  return "all-time";
}

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
  const queryClient = useQueryClient();
  const {
    dateRange,
    setDateRange,
    forceMockData,
    setForceMockData,
    lastRefreshAt,
    setLastRefreshAt,
    qualityView,
    setQualityView,
  } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch tutor detail data
  const {
    data: tutorData,
    isLoading,
    error,
    dataUpdatedAt,
  } = useTutorDetailData(tutorId);

  // Fetch score breakdown
  const {
    data: scoreBreakdownData,
    isLoading: isLoadingBreakdown,
  } = useTutorScoreBreakdown(tutorId);

  // Handle data source toggle
  const handleDataSourceToggle = (enabled: boolean) => {
    setIsRefreshing(true);
    setForceMockData(!enabled);
    queryClient.invalidateQueries({ queryKey: ["tutor-detail", tutorId] });
    setLastRefreshAt(new Date());

    setTimeout(() => {
      if (!isLoading) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["tutor-detail", tutorId] });
    setLastRefreshAt(new Date());
    
    setTimeout(() => {
      if (!isLoading) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  // Reset refreshing state when loading completes
  useEffect(() => {
    if (!isLoading && isRefreshing) {
      const timer = setTimeout(() => {
        setIsRefreshing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isRefreshing]);

  // Update lastRefreshAt when data updates
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastRefreshAt(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastRefreshAt]);

  // Determine if using mock data
  const isMockData = useMemo(() => {
    return forceMockData;
  }, [forceMockData]);

  // Date range filter logic
  const currentFilter = getCurrentQuickFilter(dateRange);
  const selectedFilter = QUICK_FILTERS.find((f) => f.id === currentFilter);

  const handleFilterChange = (filterId: QuickFilter) => {
    const filter = QUICK_FILTERS.find((f) => f.id === filterId);
    if (filter) {
      setDateRange(filter.getDateRange());
    }
  };

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

      {/* Filter Bar - Sticky Below Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Left Side - Data Health and Refresh */}
          <div className="flex items-center gap-6">
            {/* Data Health Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Data Health:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {isMockData ? "Mock" : "Live"}
                </span>
                <Switch
                  checked={!forceMockData}
                  onChange={handleDataSourceToggle}
                  className={`${
                    !forceMockData ? "bg-green-500" : "bg-yellow-500"
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      !forceMockData ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                title="Refresh data"
              >
                <RefreshCw
                  className={`h-4 w-4 transition-transform ${isLoading || isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              {lastRefreshAt && (
                <span className="text-sm text-gray-500">
                  {format(lastRefreshAt, "h:mm:ss a")}
                </span>
              )}
            </div>
          </div>

          {/* Center - Tutor ID */}
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xl font-bold text-gray-900">
              Tutor ID: {tutorId}
            </span>
          </div>

          {/* Right Side - Date Range and Students Toggle */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Date Range:
              </label>
              <Listbox value={currentFilter} onChange={handleFilterChange}>
                <div className="relative">
                  <Listbox.Button className="relative w-48 cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left text-sm shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm">
                    <span className="block truncate">
                      {selectedFilter?.label || "Select range"}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronsUpDown
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {QUICK_FILTERS.map((filter) => (
                        <Listbox.Option
                          key={filter.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                            }`
                          }
                          value={filter.id}
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {filter.label}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                  <Check className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>

            {/* Students Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Students:
              </label>
              <RadioGroup value={qualityView} onChange={setQualityView}>
                <div className="flex gap-2 rounded-md bg-gray-100 p-1">
                  <RadioGroup.Option value="all">
                    {({ checked }) => (
                      <button
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          checked
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        All
                      </button>
                    )}
                  </RadioGroup.Option>
                  <RadioGroup.Option value="first">
                    {({ checked }) => (
                      <button
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          checked
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        New
                      </button>
                    )}
                  </RadioGroup.Option>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
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

