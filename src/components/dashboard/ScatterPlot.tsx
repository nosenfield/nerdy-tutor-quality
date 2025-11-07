"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceArea,
  ReferenceLine,
  Legend,
} from "recharts";
import { CHART_THEME } from "@/lib/chart-theme";
import type { ScatterPlotDataPoint } from "@/lib/types/dashboard";
import { Maximize2, RotateCcw } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/dashboardStore";

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
  plotType?: "attendance" | "reschedules" | "quality";
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
  plotType,
}: ScatterPlotProps) {
  const { setFullscreenPlot } = useDashboardStore();
  const [xDomain, setXDomain] = useState<[number, number]>([0, 150]);
  // Quality plot uses 1-5 rating scale, others use 0-100 percentage
  const [yDomain, setYDomain] = useState<[number, number]>(
    plotType === "quality" ? [0, 5] : [0, 100]
  );
  // Transform data for Recharts (expects { x, y } format)
  const chartData = data.map((point) => ({
    x: point.x,
    y: point.y,
    tutorId: point.tutorId,
  }));

  // Normalize zones - convert theme zones to match prop format
  type NormalizedZone = {
    min: number;
    max: number;
    fill: string;
    label: string;
  };

  const normalizedZones: NormalizedZone[] = zones
    ? zones.map((z) => ({
        min: z.min,
        max: z.max,
        fill: z.color,
        label: z.color, // Use color as label if no label provided
      }))
    : CHART_THEME.zones.map((z) => ({
        min: z.min,
        max: z.max,
        fill: z.fill,
        label: z.label,
      }));

  // Use normalized zones
  const displayZones = normalizedZones;

  // Extract threshold values from zones for threshold lines
  // For quality plot (1-5 scale), filter values between 0 and 5; for others (0-100), filter between 0 and 100
  const maxYValue = plotType === "quality" ? 5 : 100;
  const thresholdValues = Array.from(
    new Set(
      displayZones.flatMap((zone) => [zone.min, zone.max]).filter((v) => v > 0 && v < maxYValue)
    )
  ).sort((a, b) => a - b);

  // Handle reset view
  const handleResetView = () => {
    setXDomain([0, 150]);
    setYDomain(plotType === "quality" ? [0, 5] : [0, 100]);
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    if (plotType) {
      setFullscreenPlot(plotType);
    }
  };

  // Custom dot renderer to handle click and selection
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isSelected = payload.tutorId === selectedTutorId;

    if (isSelected) {
      // Selected dot: larger size, stroke, full opacity
      return (
        <circle
          cx={cx}
          cy={cy}
          r={CHART_THEME.dot.selected.r * 1.5} // 1.5x size
          fill={CHART_THEME.colors.neutral}
          stroke={CHART_THEME.dot.selected.stroke}
          strokeWidth={CHART_THEME.dot.selected.strokeWidth}
          opacity={1}
          style={{ cursor: "pointer" }}
          onClick={() => onDotClick(payload.tutorId)}
          aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${plotType === "quality" ? payload.y : `${payload.y}%`}`}
        />
      );
    }

    // Non-selected dots: dimmed
    return (
      <circle
        cx={cx}
        cy={cy}
        r={CHART_THEME.dot.default.r}
        fill={CHART_THEME.dot.default.fill}
        opacity={selectedTutorId ? 0.6 : CHART_THEME.dot.default.opacity} // Dim if another is selected
        style={{ cursor: "pointer" }}
        onClick={() => onDotClick(payload.tutorId)}
          aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${plotType === "quality" ? payload.y : `${payload.y}%`}`}
      />
    );
  };

  return (
    <div className="relative p-3 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title="Reset view"
            aria-label="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          {/* Fullscreen Button */}
          {plotType && (
            <button
              onClick={handleFullscreen}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={450}>
              <ScatterChart
                margin={{ top: 10, right: 10, bottom: 30, left: 30 }}
                data={chartData}
              >
          {/* Background zones - render before grid so they're behind everything */}
          {displayZones.map((zone, index) => (
            <ReferenceArea
              key={`zone-${index}`}
              y1={zone.min}
              y2={zone.max}
              fill={zone.fill}
              fillOpacity={1}
              stroke="none"
            />
          ))}

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            domain={xDomain}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -10,
              style: { textAnchor: "middle" },
            }}
            tick={{ fontSize: 12 }}
            allowDataOverflow={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={yDomain}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
            tick={{ fontSize: 12 }}
            allowDataOverflow={false}
          />
          {/* Threshold lines at zone boundaries */}
          {thresholdValues.map((value, index) => (
            <ReferenceLine
              key={`threshold-${index}`}
              y={value}
              stroke={CHART_THEME.thresholdLine.stroke}
              strokeWidth={CHART_THEME.thresholdLine.strokeWidth}
              strokeDasharray={CHART_THEME.thresholdLine.strokeDasharray}
              label={{
                value: `${value}%`,
                position: "right",
                style: { fontSize: 10, fill: CHART_THEME.thresholdLine.stroke },
              }}
            />
          ))}
          {/* Custom threshold lines if provided */}
          {thresholdLines?.map((line, index) => (
            <ReferenceLine
              key={`custom-threshold-${index}`}
              y={line.value}
              stroke={line.color}
              strokeWidth={CHART_THEME.thresholdLine.strokeWidth}
              strokeDasharray={CHART_THEME.thresholdLine.strokeDasharray}
              label={{
                value: line.label,
                position: "right",
                style: { fontSize: 10, fill: line.color },
              }}
            />
          ))}
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
                      {yLabel}: {plotType === "quality" ? data.y.toFixed(1) : `${data.y.toFixed(1)}%`}
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
          {/* Legend */}
          <Legend
            content={() => (
              <div className="flex items-center justify-center gap-4 mt-4">
                {displayZones.map((zone, index) => (
                  <div
                    key={`legend-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: zone.fill }}
                    />
                    <span className="text-gray-700">{zone.label}</span>
                  </div>
                ))}
              </div>
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

