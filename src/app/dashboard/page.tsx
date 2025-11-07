"use client";

import { useMemo, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ScatterPlot } from "@/components/dashboard/ScatterPlot";
import { QualityPlot } from "@/components/dashboard/QualityPlot";
import { TutorDetailCard } from "@/components/dashboard/TutorDetailCard";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import { useTutorSessions } from "@/lib/hooks/useDashboardData";
import { generateMockTutorSummaries } from "@/lib/mock-data/dashboard";
import type {
  ScatterPlotDataPoint,
  TutorSummary,
} from "@/lib/types/dashboard";

/**
 * Tutor Assessment Dashboard
 * 
 * Main dashboard page displaying scatter plots and tutor data.
 * This is the primary view after login.
 */
export default function DashboardPage() {
  const { dateRange, selectedTutorId, setSelectedTutor } = useDashboardStore();
  const { data: tutorsResponse, isLoading } = useTutorSessions(dateRange);
  const [clickedDotPosition, setClickedDotPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Extract data and data source from API response
  const { displayTutors, isMockData } = useMemo(() => {
    if (tutorsResponse) {
      // New format: { data, dataSource }
      if ("data" in tutorsResponse && "dataSource" in tutorsResponse) {
        return {
          displayTutors: (tutorsResponse.data as TutorSummary[]) || [],
          isMockData: tutorsResponse.dataSource === "mock",
        };
      }
      // Fallback: assume it's an array (old format or error)
      if (Array.isArray(tutorsResponse)) {
        return {
          displayTutors: tutorsResponse,
          isMockData: false, // Assume real data if no metadata
        };
      }
    }
    // If API returns empty, use mock data as final fallback
    return {
      displayTutors: generateMockTutorSummaries(150, 42),
      isMockData: true,
    };
  }, [tutorsResponse]);

  // Transform data for plots
  const attendanceData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors.map((tutor) => ({
        x: tutor.totalSessions,
        y: tutor.attendancePercentage,
        tutorId: tutor.tutorId,
      })),
    [displayTutors]
  );

  const reschedulesData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors.map((tutor) => ({
        x: tutor.totalSessions,
        y: tutor.keptSessionsPercentage,
        tutorId: tutor.tutorId,
      })),
    [displayTutors]
  );

  const qualityData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors.map((tutor) => ({
        x: tutor.totalSessions,
        y: tutor.avgRating * 20, // Convert to percentage (5.0 = 100%)
        tutorId: tutor.tutorId,
      })),
    [displayTutors]
  );

  const firstSessionQualityData: ScatterPlotDataPoint[] = useMemo(
    () =>
      displayTutors
        .filter((tutor) => tutor.firstSessionAvgRating !== undefined)
        .map((tutor) => ({
          x: tutor.totalSessions,
          y: (tutor.firstSessionAvgRating || 0) * 20, // Convert to percentage
          tutorId: tutor.tutorId,
        })),
    [displayTutors]
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Tutor Assessment Dashboard
            </h1>
            {/* Data Source Indicator */}
            {isMockData && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                Mock Data
              </span>
            )}
            {!isMockData && !isLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                Live Data
              </span>
            )}
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <DateRangeFilter />
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
                  yLabel="Attendance %"
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
                  yLabel="Sessions Kept %"
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
                <QualityPlot
                  title="Tutor Quality"
                  allSessionsData={qualityData}
                  firstSessionsData={firstSessionQualityData}
                  xLabel="Total Sessions"
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

