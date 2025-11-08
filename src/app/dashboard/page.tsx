"use client";

import { useMemo, useState, useEffect } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ScatterPlot } from "@/components/dashboard/ScatterPlot";
import { TutorDetailCard } from "@/components/dashboard/TutorDetailCard";
import { FlaggedTutorsTable } from "@/components/dashboard/FlaggedTutorsTable";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import { useTutorSessions } from "@/lib/hooks/useDashboardData";
import type {
  ScatterPlotDataPoint,
  TutorSummary,
} from "@/lib/types/dashboard";
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
 * Tutor Assessment Dashboard
 * 
 * Main dashboard page displaying scatter plots and tutor data.
 * This is the primary view after login.
 */
export default function DashboardPage() {
  const {
    dateRange,
    setDateRange,
    selectedTutorId,
    setSelectedTutor,
    forceMockData,
    setForceMockData,
    lastRefreshAt,
    setLastRefreshAt,
    qualityView,
    setQualityView,
  } = useDashboardStore();
  const queryClient = useQueryClient();
  const { data: tutorsResponse, isLoading, error, dataUpdatedAt } = useTutorSessions(
    dateRange,
    forceMockData
  );
  const [clickedDotPosition, setClickedDotPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [overlappingTutorIds, setOverlappingTutorIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract data and data source from API response
  const { displayTutors } = useMemo(() => {
    if (tutorsResponse) {
      // New format: { data, dataSource }
      if ("data" in tutorsResponse && "dataSource" in tutorsResponse) {
        return {
          displayTutors: (tutorsResponse.data as TutorSummary[]) || [],
        };
      }
      // Fallback: assume it's an array (old format)
      if (Array.isArray(tutorsResponse)) {
        return {
          displayTutors: tutorsResponse,
        };
      }
    }
    // If API returns empty, return empty array (no fallback to mock data)
    return {
      displayTutors: [],
    };
  }, [tutorsResponse]);

  // Filter tutors based on qualityView toggle for count and plots
  const filteredTutors = useMemo(() => {
    if (qualityView === "first") {
      // When "First" is selected, only show tutors that have first session data
      // A tutor has first session data if they have at least one first session metric
      return displayTutors.filter(
        (tutor) =>
          tutor.firstSessionAttendancePercentage !== undefined ||
          tutor.firstSessionKeptSessionsPercentage !== undefined ||
          tutor.firstSessionAvgRating !== undefined
      );
    }
    // When "All" is selected, show all tutors
    return displayTutors;
  }, [displayTutors, qualityView]);

  // Transform data for plots - respect qualityView toggle
  const attendanceData: ScatterPlotDataPoint[] = useMemo(
    () =>
      filteredTutors
        .filter((tutor) =>
          qualityView === "first"
            ? tutor.firstSessionAttendancePercentage !== undefined
            : true
        )
        .map((tutor) => ({
          x: tutor.totalSessions,
          y:
            qualityView === "first"
              ? tutor.firstSessionAttendancePercentage || tutor.attendancePercentage
              : tutor.attendancePercentage,
          tutorId: tutor.tutorId,
        })),
    [filteredTutors, qualityView]
  );

  const reschedulesData: ScatterPlotDataPoint[] = useMemo(
    () =>
      filteredTutors
        .filter((tutor) =>
          qualityView === "first"
            ? tutor.firstSessionKeptSessionsPercentage !== undefined
            : true
        )
        .map((tutor) => ({
          x: tutor.totalSessions,
          y:
            qualityView === "first"
              ? tutor.firstSessionKeptSessionsPercentage || tutor.keptSessionsPercentage
              : tutor.keptSessionsPercentage,
          tutorId: tutor.tutorId,
        })),
    [filteredTutors, qualityView]
  );

  const qualityData: ScatterPlotDataPoint[] = useMemo(
    () =>
      filteredTutors
        .filter((tutor) =>
          qualityView === "first"
            ? tutor.firstSessionAvgRating !== undefined
            : true
        )
        .map((tutor) => ({
          x: tutor.totalSessions,
          y:
            qualityView === "first"
              ? tutor.firstSessionAvgRating || tutor.avgRating
              : tutor.avgRating, // Use 1-5 rating scale directly
          tutorId: tutor.tutorId,
        })),
    [filteredTutors, qualityView]
  );

  // Handle dot click
  const handleDotClick = (tutorId: string, position: { x: number; y: number }, allTutorIds?: string[]) => {
    // Use the actual dot position
    setClickedDotPosition(position);
    // Store all tutor IDs for overlapping points
    if (allTutorIds && allTutorIds.length > 0) {
      setOverlappingTutorIds(allTutorIds);
      // Show the first tutor in the list when there are multiple tutors
      setSelectedTutor(allTutorIds[0]);
    } else {
      setOverlappingTutorIds([tutorId]);
      setSelectedTutor(tutorId);
    }
  };

  // Handle close detail card
  const handleCloseDetail = () => {
    setSelectedTutor(null);
    setClickedDotPosition(null);
    setOverlappingTutorIds([]);
  };

  // Handle data source toggle
  // When toggle is ON (enabled = true), show LIVE data (forceMockData = false)
  // When toggle is OFF (enabled = false), show MOCK data (forceMockData = true)
  const handleDataSourceToggle = (enabled: boolean) => {
    setIsRefreshing(true);
    setForceMockData(!enabled); // Reverse: enabled = live, !enabled = mock
    // Invalidate all queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setLastRefreshAt(new Date());

    // Ensure animation plays for at least 500ms
    setTimeout(() => {
      if (!isLoading) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setLastRefreshAt(new Date());
    
    // Ensure animation plays for at least 500ms
    setTimeout(() => {
      if (!isLoading) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  // Reset refreshing state when loading completes
  useEffect(() => {
    if (!isLoading && isRefreshing) {
      // Small delay to ensure animation completes
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
    if (forceMockData) return true;
    if (tutorsResponse && "dataSource" in tutorsResponse) {
      return tutorsResponse.dataSource === "mock";
    }
    return false;
  }, [forceMockData, tutorsResponse]);

  // Date range filter logic
  const currentFilter = getCurrentQuickFilter(dateRange);
  const selectedFilter = QUICK_FILTERS.find((f) => f.id === currentFilter);

  const handleFilterChange = (filterId: QuickFilter) => {
    const filter = QUICK_FILTERS.find((f) => f.id === filterId);
    if (filter) {
      setDateRange(filter.getDateRange());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            🚂 Tooter
          </h1>
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
                  checked={!forceMockData} // Toggle ON = Live (forceMockData = false)
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

          {/* Center - Tutor Count */}
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xl font-bold text-gray-900">
              Tutors in Data Set:
            </span>
            <span className="text-xl font-bold text-gray-900">
              {filteredTutors.length}
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

      {/* Main Content */}
      <main className="p-6">
        <div className="w-full space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to load tutor data
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {error instanceof Error
                      ? error.message
                      : "Unable to fetch data from the database. Please check your connection and try again."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Plots Grid - Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Attendance Plot */}
            <div className="relative">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              ) : (
                <ScatterPlot
                  title="Tutor Attendance"
                  data={attendanceData}
                  xLabel="Total Sessions"
                  yLabel={
                    qualityView === "first"
                      ? "New Student Attendance %"
                      : "Attendance %"
                  }
                  onDotClick={handleDotClick}
                  selectedTutorId={selectedTutorId}
                  plotType="attendance"
                />
              )}
            </div>

            {/* Reschedules Plot */}
            <div className="relative">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              ) : (
                      <ScatterPlot
                        title="Sessions Kept"
                        data={reschedulesData}
                        xLabel="Total Sessions"
                        yLabel={
                          qualityView === "first"
                            ? "New Student Kept %"
                            : "Sessions Kept %"
                        }
                        onDotClick={handleDotClick}
                        selectedTutorId={selectedTutorId}
                        plotType="reschedules"
                      />
              )}
            </div>

            {/* Quality Plot */}
            <div className="relative md:col-span-2 lg:col-span-1">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              ) : (
                      <ScatterPlot
                        title="Tutor Quality"
                        data={qualityData}
                        xLabel="Total Sessions"
                        yLabel={
                          qualityView === "first"
                            ? "New Student Rating"
                            : "Average Rating"
                        }
                        onDotClick={handleDotClick}
                        selectedTutorId={selectedTutorId}
                        plotType="quality"
                      />
              )}
            </div>
          </div>

          {/* Flagged Tutors Table */}
          <FlaggedTutorsTable />
        </div>
      </main>

      {/* Tutor Detail Card */}
      {selectedTutorId && clickedDotPosition && (
        <TutorDetailCard
          tutorId={selectedTutorId}
          tutorIds={overlappingTutorIds.length > 0 ? overlappingTutorIds : [selectedTutorId]}
          position={clickedDotPosition}
          onClose={handleCloseDetail}
          onTutorChange={setSelectedTutor}
        />
      )}
    </div>
  );
}

