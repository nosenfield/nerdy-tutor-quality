"use client";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { CHART_THEME } from "@/lib/chart-theme";
import type { ScatterPlotDataPoint } from "@/lib/types/dashboard";

/**
 * Scatter Plot Component Props
 */
export interface ScatterPlotProps {
  title: string;
  data: ScatterPlotDataPoint[];
  xLabel: string;
  yLabel: string;
  thresholdLines?: Array<{ value: number; color: string; label: string }>;
  onDotClick: (tutorId: string) => void;
  selectedTutorId?: string | null;
  zones?: Array<{ min: number; max: number; color: string }>;
}

/**
 * Scatter Plot Component
 * 
 * Reusable scatter plot component for dashboard visualizations.
 * Uses Recharts library with centralized chart theme.
 */
export function ScatterPlot({
  title,
  data,
  xLabel,
  yLabel,
  thresholdLines,
  onDotClick,
  selectedTutorId,
  zones,
}: ScatterPlotProps) {
  // Transform data for Recharts (expects { x, y } format)
  const chartData = data.map((point) => ({
    x: point.x,
    y: point.y,
    tutorId: point.tutorId,
  }));

  // Custom dot renderer to handle click and selection
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isSelected = payload.tutorId === selectedTutorId;

    if (isSelected) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={CHART_THEME.dot.selected.r}
          fill={CHART_THEME.colors.neutral}
          stroke={CHART_THEME.dot.selected.stroke}
          strokeWidth={CHART_THEME.dot.selected.strokeWidth}
          style={{ cursor: "pointer" }}
          onClick={() => onDotClick(payload.tutorId)}
          aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${payload.y}%`}
        />
      );
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={CHART_THEME.dot.default.r}
        fill={CHART_THEME.dot.default.fill}
        opacity={CHART_THEME.dot.default.opacity}
        style={{ cursor: "pointer" }}
        onClick={() => onDotClick(payload.tutorId)}
        aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${payload.y}%`}
      />
    );
  };

  return (
    <div className="relative p-6 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
          data={chartData}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            domain={[0, 150]}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -10,
              style: { textAnchor: "middle" },
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={[0, 100]}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload as {
                  x: number;
                  y: number;
                  tutorId: string;
                };
                return (
                  <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
                    <p className="text-sm font-medium">
                      Tutor: {data.tutorId}
                    </p>
                    <p className="text-sm text-gray-600">
                      {xLabel}: {data.x}
                    </p>
                    <p className="text-sm text-gray-600">
                      {yLabel}: {data.y.toFixed(1)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter
            name="Tutors"
            data={chartData}
            shape={renderDot}
            isAnimationActive={true}
            animationDuration={CHART_THEME.animation.duration}
          >
            {chartData.map((entry, index) => {
              const isSelected = entry.tutorId === selectedTutorId;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    isSelected
                      ? CHART_THEME.colors.neutral
                      : CHART_THEME.dot.default.fill
                  }
                  opacity={isSelected ? 1 : CHART_THEME.dot.default.opacity}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

