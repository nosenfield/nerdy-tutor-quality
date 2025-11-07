"use client";

import { useMemo, useState, useEffect } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ScatterPlot } from "@/components/dashboard/ScatterPlot";
import { TutorDetailCard } from "@/components/dashboard/TutorDetailCard";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import { useTutorSessions } from "@/lib/hooks/useDashboardData";
import { generateMockTutorSummaries } from "@/lib/mock-data/dashboard";
import type {
  ScatterPlotDataPoint,
  TutorSummary,
} from "@/lib/types/dashboard";
import { Switch } from "@headlessui/react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Tutor Assessment Dashboard
 * 
 * Main dashboard page displaying scatter plots and tutor data.
 * This is the primary view after login.
 */
export default function DashboardPage() {
  const {
    dateRange,
    selectedTutorId,
    setSelectedTutor,
    forceMockData,
    setForceMockData,
    lastRefreshAt,
    setLastRefreshAt,
    qualityView,
  } = useDashboardStore();
  const queryClient = useQueryClient();
  const { data: tutorsResponse, isLoading, dataUpdatedAt } = useTutorSessions(
    dateRange,
    forceMockData
  );
  const [clickedDotPosition, setClickedDotPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
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
      // Fallback: assume it's an array (old format or error)
      if (Array.isArray(tutorsResponse)) {
        return {
          displayTutors: tutorsResponse,
        };
      }
    }
    // If API returns empty, use mock data as final fallback
    return {
      displayTutors: generateMockTutorSummaries(150, 42),
    };
  }, [tutorsResponse]);

  // Transform data for plots - respect qualityView toggle
  const attendanceData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors
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
    [displayTutors, qualityView]
  );

  const reschedulesData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors
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
    [displayTutors, qualityView]
  );

  const qualityData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors
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
    [displayTutors, qualityView]
  );

  // Handle dot click
  const handleDotClick = (tutorId: string) => {
    setSelectedTutor(tutorId);
    // Get click position for detail card (use center of viewport as fallback)
    setClickedDotPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  };

  // Handle close detail card
  const handleCloseDetail = () => {
    setSelectedTutor(null);
    setClickedDotPosition(null);
  };

  // Handle data source toggle
  const handleDataSourceToggle = (enabled: boolean) => {
    setIsRefreshing(true);
    setForceMockData(enabled);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Tutor Assessment Dashboard
            </h1>
            {/* Data Source Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {forceMockData ? "Mock" : "Live"}
              </span>
              <Switch
                checked={forceMockData}
                onChange={handleDataSourceToggle}
                className={`${
                  forceMockData ? "bg-yellow-500" : "bg-green-500"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    forceMockData ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
            {/* Refresh Button */}
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
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <DateRangeFilter
              tutorCount={displayTutors.length}
              lastRefreshAt={lastRefreshAt}
            />
          </div>

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
                      ? "First Session Attendance %"
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
                            ? "First Session Kept %"
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
                            ? "First Session Rating"
                            : "Average Rating"
                        }
                        onDotClick={handleDotClick}
                        selectedTutorId={selectedTutorId}
                        plotType="quality"
                      />
              )}
            </div>
          </div>

          {/* Table Section - Placeholder */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-500 text-sm text-center">
              Flagged Tutors Table (CC-7)
            </p>
          </div>
        </div>
      </main>

      {/* Tutor Detail Card */}
      {selectedTutorId && clickedDotPosition && (
        <TutorDetailCard
          tutorId={selectedTutorId}
          position={clickedDotPosition}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

