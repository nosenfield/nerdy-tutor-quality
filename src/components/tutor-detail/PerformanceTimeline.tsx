"use client";

import { useMemo } from "react";
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
import { format, parseISO, startOfDay, eachDayOfInterval } from "date-fns";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface PerformanceTimelineProps {
  allSessions: TutorDetailResponse["all_sessions"];
  activeFlags: TutorDetailResponse["active_flags"];
  interventions: TutorDetailResponse["interventions"];
  dateRange: { start: Date; end: Date };
}


/**
 * Aggregate sessions by day or week based on date range length
 * Shows a data point for each day/week in the date range, with null values for periods without sessions
 */
function transformPerformanceData(
  allSessions: TutorDetailResponse["all_sessions"],
  flags: TutorDetailResponse["active_flags"],
  interventions: TutorDetailResponse["interventions"],
  dateRange: { start: Date; end: Date }
) {
  // Filter sessions by date range
  const filteredSessions = allSessions.filter((session) => {
    const sessionDate = parseISO(session.session_start_time);
    return sessionDate >= dateRange.start && sessionDate <= dateRange.end;
  });

  // Get all days in the date range for the X-axis
  const startDay = startOfDay(dateRange.start);
  const endDay = startOfDay(dateRange.end);
  const allDays = eachDayOfInterval({ start: startDay, end: endDay });

  // Group sessions by day
  const sessionsByDay = new Map<string, typeof filteredSessions>();

  filteredSessions.forEach((session) => {
    const sessionDate = parseISO(session.session_start_time);
    const dayDate = startOfDay(sessionDate);
    const dayKey = format(dayDate, "yyyy-MM-dd");

    if (!sessionsByDay.has(dayKey)) {
      sessionsByDay.set(dayKey, []);
    }
    sessionsByDay.get(dayKey)!.push(session);
  });

  // Generate data points for ALL days in the date range
  // Days with sessions will have values and show dots
  // Days without sessions will have null values (no dots, but X-axis still shows the day)
  const chartData: Array<{
    date: string;
    dateFormatted: string;
    totalSessions: number | null;
    attendedSessions: number | null;
    keptSessions: number | null;
    avgRating: number | null;
  }> = allDays.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const daySessions = sessionsByDay.get(dayKey) || [];

    // If no sessions for this day, return null values (no dot will be shown)
    if (daySessions.length === 0) {
      return {
        date: dayKey,
        dateFormatted: format(day, "MMM d"),
        totalSessions: null,
        attendedSessions: null,
        keptSessions: null,
        avgRating: null,
      };
    }

    // Calculate metrics for days with sessions
    const totalSessions = daySessions.length;

    // Calculate attended sessions count (sessions where tutor joined)
    const noShowCount = daySessions.filter(
      (s) => !s.tutor_join_time
    ).length;
    const attendedSessions = totalSessions - noShowCount;

    // Calculate kept sessions count (sessions that were not rescheduled)
    const rescheduleCount = daySessions.filter(
      (s) => s.was_rescheduled
    ).length;
    const keptSessions = totalSessions - rescheduleCount;

    // Calculate average rating (1-5 scale)
    const ratings = daySessions
      .map((s) => s.student_feedback_rating)
      .filter((r): r is number => r !== null && r !== undefined);
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
      : null;

    return {
      date: dayKey,
      dateFormatted: format(day, "MMM d"),
      totalSessions,
      attendedSessions,
      keptSessions,
      avgRating: avgRating ?? null,
    };
  });

  // Add flag markers - always use daily aggregation
  const flagMarkers = flags
    .filter((flag) => {
      const flagDate = parseISO(flag.created_at);
      return flagDate >= dateRange.start && flagDate <= dateRange.end;
    })
    .map((flag) => {
      const flagDate = parseISO(flag.created_at);
      
      // Find the chart data point for this flag (daily aggregation)
      const flagDay = startOfDay(flagDate);
      const flagDayKey = format(flagDay, "yyyy-MM-dd");
      const dayPoint = chartData.find((point) => point.date === flagDayKey);
      const targetPoint = dayPoint || chartData.reduce((closest, point) => {
        const pointDate = parseISO(point.date);
        const closestDate = parseISO(closest.date);
        return Math.abs(pointDate.getTime() - flagDate.getTime()) <
          Math.abs(closestDate.getTime() - flagDate.getTime())
          ? point
          : closest;
      }, chartData[0]);

      return {
        date: flag.created_at,
        dateFormatted: targetPoint?.dateFormatted ?? format(flagDate, "MMM d"),
        y: targetPoint?.totalSessions ?? 0,
        type: "flag",
        severity: flag.severity,
        title: flag.title,
      };
    });

  // Add intervention markers - always use daily aggregation
  const interventionMarkers = interventions
    .filter((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      return interventionDate >= dateRange.start && interventionDate <= dateRange.end;
    })
    .map((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      
      // Find the chart data point for this intervention (daily aggregation)
      const interventionDay = startOfDay(interventionDate);
      const interventionDayKey = format(interventionDay, "yyyy-MM-dd");
      const dayPoint = chartData.find((point) => point.date === interventionDayKey);
      const targetPoint = dayPoint || chartData.reduce((closest, point) => {
        const pointDate = parseISO(point.date);
        const closestDate = parseISO(closest.date);
        return Math.abs(pointDate.getTime() - interventionDate.getTime()) <
          Math.abs(closestDate.getTime() - interventionDate.getTime())
          ? point
          : closest;
      }, chartData[0]);

      return {
        date: intervention.intervention_date,
        dateFormatted: targetPoint?.dateFormatted ?? format(interventionDate, "MMM d"),
        y: targetPoint?.totalSessions ?? 0,
        type: "intervention",
        interventionType: intervention.intervention_type,
      };
    });

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
        {payload.map((entry: any, index: number) => {
          const value = entry.dataKey === "avgRating" 
            ? entry.value.toFixed(2)
            : Math.round(entry.value).toString();
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {value}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}

/**
 * Performance Timeline Chart Component
 * 
 * Displays tutor performance progression over time with:
 * - Attended sessions count (sessions where tutor joined)
 * - Kept sessions count (sessions that were not rescheduled)
 * - Average rating (1-5 scale)
 * - Flag event markers
 * - Intervention event markers
 * 
 * Uses the date range from the header filter to determine the time period.
 * Always aggregates by day - shows a data point for each day that has at least one session.
 * 
 * Task 4.17 - KEY TASK
 */
export function PerformanceTimeline({
  allSessions,
  activeFlags,
  interventions,
  dateRange,
}: PerformanceTimelineProps) {
  const { chartData, flagMarkers, interventionMarkers } = useMemo(
    () =>
      transformPerformanceData(
        allSessions,
        activeFlags,
        interventions,
        dateRange
      ),
    [allSessions, activeFlags, interventions, dateRange]
  );

  // Check if there's any data with actual values (not all null)
  const hasData = chartData.some(
    (point) =>
      point.attendedSessions !== null ||
      point.keptSessions !== null ||
      point.avgRating !== null
  );

  // Calculate max session count for Y-axis domain (with 10% padding)
  const maxSessionCount = Math.max(
    ...chartData.map((point) => point.totalSessions ?? 0),
    1 // Minimum of 1 to avoid division by zero
  );
  const yAxisMax = Math.ceil(maxSessionCount * 1.1);

  // Calculate number of days in the date range
  const daysInRange = chartData.length;
  // For 7 days or less, show all ticks (interval = 0 means show all)
  // For ~30 days (28-31), show every 3rd day (interval = 2 means skip 2 ticks between shown ticks)
  // For other ranges, let Recharts auto-calculate
  const xAxisInterval = daysInRange <= 7 ? 0 : daysInRange >= 28 && daysInRange <= 31 ? 2 : undefined;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-6 mb-6 [&_*]:outline-none [&_*]:focus:outline-none [&_svg]:outline-none [&_svg:focus]:outline-none select-none"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.preventDefault()}
      style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {hasData ? (
        <>
          <div 
            className="h-96 [&_*]:outline-none [&_*]:focus:outline-none [&_svg]:outline-none [&_svg:focus]:outline-none select-none" 
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="dateFormatted"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={xAxisInterval}
                />
                <YAxis
                  yAxisId="count"
                  domain={[0, yAxisMax]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => Math.round(value).toString()}
                  label={{
                    value: "Session Count",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                />
                <YAxis
                  yAxisId="rating"
                  orientation="right"
                  domain={[1, 5]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Rating (1-5)",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Attended Sessions Line */}
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="attendedSessions"
                  name="Attended Sessions"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: "#10B981", r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                />

                {/* Kept Sessions Line */}
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="keptSessions"
                  name="Kept Sessions"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                />

                {/* Average Rating Line */}
                <Line
                  yAxisId="rating"
                  type="monotone"
                  dataKey="avgRating"
                  name="Avg Rating"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: "#F59E0B", r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                />

                {/* Flag Markers */}
                {flagMarkers.map((flag, index) => (
                  <ReferenceDot
                    key={`flag-${index}`}
                    x={flag.dateFormatted}
                    y={flag.y}
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
                    y={intervention.y}
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
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Flag Raised</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>Intervention</span>
            </div>
          </div>
        </>
      ) : (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">
              No data available for the selected date range
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting the date filter to see performance data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

