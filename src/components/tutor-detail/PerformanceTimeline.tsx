"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface PerformanceTimelineProps {
  performanceHistory: TutorDetailResponse["performance_history"];
  activeFlags: TutorDetailResponse["active_flags"];
  interventions: TutorDetailResponse["interventions"];
}

type TimePeriod = "30d" | "60d" | "90d" | "all";

/**
 * Calculate component scores from performance history entry
 * 
 * Note: The API doesn't return component scores in performance_history,
 * so we'll only show overall score for now. Component scores can be
 * calculated if needed, but that would require additional API calls.
 */
function transformPerformanceData(
  history: TutorDetailResponse["performance_history"],
  flags: TutorDetailResponse["active_flags"],
  interventions: TutorDetailResponse["interventions"],
  period: TimePeriod
) {
  const now = new Date();
  let cutoffDate: Date;

  switch (period) {
    case "30d":
      cutoffDate = subDays(now, 30);
      break;
    case "60d":
      cutoffDate = subDays(now, 60);
      break;
    case "90d":
      cutoffDate = subDays(now, 90);
      break;
    default:
      cutoffDate = new Date(0); // All time
  }

  // Filter history by date range
  const filteredHistory = history.filter((entry) => {
    const entryDate = parseISO(entry.calculated_at);
    return entryDate >= cutoffDate;
  });

  // Sort by date (oldest first)
  const sortedHistory = [...filteredHistory].sort(
    (a, b) =>
      parseISO(a.calculated_at).getTime() - parseISO(b.calculated_at).getTime()
  );

  // Transform to chart data format
  const chartData = sortedHistory.map((entry) => ({
    date: entry.calculated_at,
    dateFormatted: format(parseISO(entry.calculated_at), "MMM d"),
    overallScore: entry.overall_score,
    // Component scores would go here if available
    // attendanceScore: calculateAttendanceScore(entry),
    // ratingsScore: calculateRatingsScore(entry),
    // completionScore: calculateCompletionScore(entry),
    // reliabilityScore: calculateReliabilityScore(entry),
  }));

  // Add flag markers
  const flagMarkers = sortedHistory.length > 0 ? (flags
    .filter((flag) => {
      const flagDate = parseISO(flag.created_at);
      return flagDate >= cutoffDate;
    })
    .map((flag) => {
      const flagDate = parseISO(flag.created_at);
      // Find the closest performance history entry
      const closestEntry = sortedHistory.reduce((closest, entry) => {
        const entryDate = parseISO(entry.calculated_at);
        const closestDate = parseISO(closest.calculated_at);
        return Math.abs(entryDate.getTime() - flagDate.getTime()) <
          Math.abs(closestDate.getTime() - flagDate.getTime())
          ? entry
          : closest;
      }, sortedHistory[0]);

      return {
        date: flag.created_at,
        dateFormatted: format(flagDate, "MMM d"),
        score: closestEntry?.overall_score ?? 0,
        type: "flag",
        severity: flag.severity,
        title: flag.title,
      };
    })) : [];

  // Add intervention markers
  const interventionMarkers = sortedHistory.length > 0 ? (interventions
    .filter((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      return interventionDate >= cutoffDate;
    })
    .map((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      // Find the closest performance history entry
      const closestEntry = sortedHistory.reduce((closest, entry) => {
        const entryDate = parseISO(entry.calculated_at);
        const closestDate = parseISO(closest.calculated_at);
        return Math.abs(entryDate.getTime() - interventionDate.getTime()) <
          Math.abs(closestDate.getTime() - interventionDate.getTime())
          ? entry
          : closest;
      }, sortedHistory[0]);

      return {
        date: intervention.intervention_date,
        dateFormatted: format(interventionDate, "MMM d"),
        score: closestEntry?.overall_score ?? 0,
        type: "intervention",
        interventionType: intervention.intervention_type,
      };
    })) : [];

  return {
    chartData,
    flagMarkers,
    interventionMarkers,
  };
}

/**
 * Custom tooltip for the timeline chart
 */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(1)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * Performance Timeline Chart Component
 * 
 * Displays tutor performance progression over time with:
 * - Overall score line chart
 * - Flag event markers
 * - Intervention event markers
 * - Time period selector
 * 
 * Task 4.17 - KEY TASK
 */
export function PerformanceTimeline({
  performanceHistory,
  activeFlags,
  interventions,
}: PerformanceTimelineProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("90d");

  const { chartData, flagMarkers, interventionMarkers } = useMemo(
    () =>
      transformPerformanceData(
        performanceHistory,
        activeFlags,
        interventions,
        selectedPeriod
      ),
    [performanceHistory, activeFlags, interventions, selectedPeriod]
  );

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Performance Timeline
        </h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No performance history data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Performance Timeline
        </h2>
        <div className="flex gap-2">
          {(["30d", "60d", "90d", "all"] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedPeriod === period
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {period === "all" ? "All Time" : `Last ${period}`}
            </button>
          ))}
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{
                value: "Score",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Overall Score Line - Primary */}
            <Line
              type="monotone"
              dataKey="overallScore"
              name="Overall Score"
              stroke="#4F46E5"
              strokeWidth={3}
              dot={{ fill: "#4F46E5", r: 4 }}
              activeDot={{ r: 6 }}
            />

            {/* Flag Markers */}
            {flagMarkers.map((flag, index) => (
              <ReferenceDot
                key={`flag-${index}`}
                x={flag.dateFormatted}
                y={flag.score}
                r={6}
                fill={
                  flag.severity === "critical"
                    ? "#DC2626"
                    : flag.severity === "high"
                    ? "#EA580C"
                    : flag.severity === "medium"
                    ? "#F59E0B"
                    : "#3B82F6"
                }
                stroke="#FFF"
                strokeWidth={2}
              />
            ))}

            {/* Intervention Markers */}
            {interventionMarkers.map((intervention, index) => (
              <ReferenceDot
                key={`intervention-${index}`}
                x={intervention.dateFormatted}
                y={intervention.score}
                r={6}
                fill="#10B981"
                stroke="#FFF"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for markers */}
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
          <span>Overall Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span>Flag Raised</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Intervention</span>
        </div>
      </div>
    </div>
  );
}

