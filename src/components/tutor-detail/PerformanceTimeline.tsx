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
import { format, parseISO, startOfDay, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
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

  // Determine aggregation period based on date range length
  const startDay = startOfDay(dateRange.start);
  const endDay = startOfDay(dateRange.end);
  const daysInRange = differenceInDays(endDay, startDay) + 1;
  const useWeeklyAggregation = daysInRange > 30; // Use weekly for ranges > 30 days

  let chartData: Array<{
    date: string;
    dateFormatted: string;
    attendancePercentage: number | null;
    sessionsKeptPercentage: number | null;
    avgRating: number | null;
  }>;

  if (useWeeklyAggregation) {
    // Weekly aggregation for longer ranges (e.g., 90 days)
    const allWeeks = eachWeekOfInterval({ start: startDay, end: endDay }, { weekStartsOn: 1 });
    
    // Group sessions by week
    const sessionsByWeek = new Map<string, typeof filteredSessions>();

    filteredSessions.forEach((session) => {
      const sessionDate = parseISO(session.session_start_time);
      const weekStart = startOfWeek(sessionDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");

      if (!sessionsByWeek.has(weekKey)) {
        sessionsByWeek.set(weekKey, []);
      }
      sessionsByWeek.get(weekKey)!.push(session);
    });

    // Calculate metrics for each week in the range
    chartData = allWeeks.map((weekStart) => {
      const weekKey = format(weekStart, "yyyy-MM-dd");
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekSessions = sessionsByWeek.get(weekKey) || [];

      // If no sessions for this week, return null values
      if (weekSessions.length === 0) {
        return {
          date: weekKey,
          dateFormatted: format(weekStart, "MMM d"),
          attendancePercentage: null,
          sessionsKeptPercentage: null,
          avgRating: null,
        };
      }

      const totalSessions = weekSessions.length;

      // Calculate attendance % (1 - no_show_rate)
      const noShowCount = weekSessions.filter(
        (s) => !s.tutor_join_time
      ).length;
      const noShowRate = totalSessions > 0 ? noShowCount / totalSessions : 0;
      const attendancePercentage = (1 - noShowRate) * 100;

      // Calculate sessions kept % (1 - reschedule_rate)
      const rescheduleCount = weekSessions.filter(
        (s) => s.was_rescheduled
      ).length;
      const rescheduleRate = totalSessions > 0 ? rescheduleCount / totalSessions : 0;
      const sessionsKeptPercentage = (1 - rescheduleRate) * 100;

      // Calculate average rating (1-5 scale)
      const ratings = weekSessions
        .map((s) => s.student_feedback_rating)
        .filter((r): r is number => r !== null && r !== undefined);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
        : null;

      return {
        date: weekKey,
        dateFormatted: format(weekStart, "MMM d"),
        attendancePercentage,
        sessionsKeptPercentage,
        avgRating: avgRating ?? null,
      };
    });
  } else {
    // Daily aggregation for shorter ranges (7-30 days)
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

    // Calculate metrics for each day in the range
    chartData = allDays.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const daySessions = sessionsByDay.get(dayKey) || [];

      // If no sessions for this day, return null values
      if (daySessions.length === 0) {
        return {
          date: dayKey,
          dateFormatted: format(day, "MMM d"),
          attendancePercentage: null,
          sessionsKeptPercentage: null,
          avgRating: null,
        };
      }

      const totalSessions = daySessions.length;

      // Calculate attendance % (1 - no_show_rate)
      const noShowCount = daySessions.filter(
        (s) => !s.tutor_join_time
      ).length;
      const noShowRate = totalSessions > 0 ? noShowCount / totalSessions : 0;
      const attendancePercentage = (1 - noShowRate) * 100;

      // Calculate sessions kept % (1 - reschedule_rate)
      const rescheduleCount = daySessions.filter(
        (s) => s.was_rescheduled
      ).length;
      const rescheduleRate = totalSessions > 0 ? rescheduleCount / totalSessions : 0;
      const sessionsKeptPercentage = (1 - rescheduleRate) * 100;

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
        attendancePercentage,
        sessionsKeptPercentage,
        avgRating: avgRating ?? null,
      };
    });
  }

  // Add flag markers
  const flagMarkers = flags
    .filter((flag) => {
      const flagDate = parseISO(flag.created_at);
      return flagDate >= dateRange.start && flagDate <= dateRange.end;
    })
    .map((flag) => {
      const flagDate = parseISO(flag.created_at);
      
      // Find the chart data point for this flag
      let targetPoint: typeof chartData[0];
      
      if (useWeeklyAggregation) {
        // For weekly aggregation, find the week that contains this flag
        const flagWeekStart = startOfWeek(flagDate, { weekStartsOn: 1 });
        const flagWeekKey = format(flagWeekStart, "yyyy-MM-dd");
        const weekPoint = chartData.find((point) => point.date === flagWeekKey);
        targetPoint = weekPoint || chartData.reduce((closest, point) => {
          const pointDate = parseISO(point.date);
          const closestDate = parseISO(closest.date);
          return Math.abs(pointDate.getTime() - flagDate.getTime()) <
            Math.abs(closestDate.getTime() - flagDate.getTime())
            ? point
            : closest;
        }, chartData[0]);
      } else {
        // For daily aggregation, find the day
        const flagDay = startOfDay(flagDate);
        const flagDayKey = format(flagDay, "yyyy-MM-dd");
        const dayPoint = chartData.find((point) => point.date === flagDayKey);
        targetPoint = dayPoint || chartData.reduce((closest, point) => {
          const pointDate = parseISO(point.date);
          const closestDate = parseISO(closest.date);
          return Math.abs(pointDate.getTime() - flagDate.getTime()) <
            Math.abs(closestDate.getTime() - flagDate.getTime())
            ? point
            : closest;
        }, chartData[0]);
      }

      return {
        date: flag.created_at,
        dateFormatted: targetPoint?.dateFormatted ?? format(flagDate, "MMM d"),
        y: targetPoint?.attendancePercentage ?? 0,
        type: "flag",
        severity: flag.severity,
        title: flag.title,
      };
    });

  // Add intervention markers
  const interventionMarkers = interventions
    .filter((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      return interventionDate >= dateRange.start && interventionDate <= dateRange.end;
    })
    .map((intervention) => {
      const interventionDate = parseISO(intervention.intervention_date);
      
      // Find the chart data point for this intervention
      let targetPoint: typeof chartData[0];
      
      if (useWeeklyAggregation) {
        // For weekly aggregation, find the week that contains this intervention
        const interventionWeekStart = startOfWeek(interventionDate, { weekStartsOn: 1 });
        const interventionWeekKey = format(interventionWeekStart, "yyyy-MM-dd");
        const weekPoint = chartData.find((point) => point.date === interventionWeekKey);
        targetPoint = weekPoint || chartData.reduce((closest, point) => {
          const pointDate = parseISO(point.date);
          const closestDate = parseISO(closest.date);
          return Math.abs(pointDate.getTime() - interventionDate.getTime()) <
            Math.abs(closestDate.getTime() - interventionDate.getTime())
            ? point
            : closest;
        }, chartData[0]);
      } else {
        // For daily aggregation, find the day
        const interventionDay = startOfDay(interventionDate);
        const interventionDayKey = format(interventionDay, "yyyy-MM-dd");
        const dayPoint = chartData.find((point) => point.date === interventionDayKey);
        targetPoint = dayPoint || chartData.reduce((closest, point) => {
          const pointDate = parseISO(point.date);
          const closestDate = parseISO(closest.date);
          return Math.abs(pointDate.getTime() - interventionDate.getTime()) <
            Math.abs(closestDate.getTime() - interventionDate.getTime())
            ? point
            : closest;
        }, chartData[0]);
      }

      return {
        date: intervention.intervention_date,
        dateFormatted: targetPoint?.dateFormatted ?? format(interventionDate, "MMM d"),
        y: targetPoint?.attendancePercentage ?? 0,
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
            : `${entry.value.toFixed(1)}%`;
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
 * - Session attendance % (0-100%)
 * - Sessions kept % (0-100%)
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
      point.attendancePercentage !== null ||
      point.sessionsKeptPercentage !== null ||
      point.avgRating !== null
  );

  // Calculate number of days in the date range
  const daysInRange = chartData.length;
  // For 7 days or less, show all ticks (interval = 0 means show all)
  // For longer ranges, let Recharts auto-calculate
  const xAxisInterval = daysInRange <= 7 ? 0 : undefined;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Performance Timeline
        </h2>
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
              interval={xAxisInterval}
            />
            <YAxis
              yAxisId="percentage"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{
                value: "Percentage (%)",
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

            {/* Session Attendance Line */}
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="attendancePercentage"
              name="Attendance %"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: "#10B981", r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={true}
            />

            {/* Sessions Kept Line */}
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="sessionsKeptPercentage"
              name="Sessions Kept %"
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
    </div>
  );
}

