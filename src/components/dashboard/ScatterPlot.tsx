"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
} from "recharts";
import { CHART_THEME } from "@/lib/chart-theme";
import type { ScatterPlotDataPoint } from "@/lib/types/dashboard";
import { Maximize2 } from "lucide-react";
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
  onDotClick: (tutorId: string, position: { x: number; y: number }, allTutorIds?: string[]) => void;
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
  
  // Calculate maximum total sessions from data (with 10% padding)
  const maxTotalSessions = useMemo(() => {
    if (data.length === 0) return 10; // Default if no data
    const maxX = Math.max(...data.map((point) => point.x));
    // Add 10% padding, minimum of 1, and round up to nearest integer
    return Math.ceil(maxX * 1.1) || 10;
  }, [data]);
  
  const [xDomain, setXDomain] = useState<[number, number]>([0, maxTotalSessions]);
  // Quality plot uses 1-5 rating scale, others use 0-100 percentage
  // For quality plot, use [1, 5] to show only valid rating range
  const [yDomain, setYDomain] = useState<[number, number]>(
    plotType === "quality" ? [1, 5] : [0, 100]
  );
  
  // Touch support state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartCenter, setTouchStartCenter] = useState<{ x: number; y: number } | null>(null);
  const [touchStartDomains, setTouchStartDomains] = useState<{ x: [number, number]; y: [number, number] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };
    checkTouchDevice();
    window.addEventListener("resize", checkTouchDevice);
    return () => window.removeEventListener("resize", checkTouchDevice);
  }, []);
  
  // Update xDomain when maxTotalSessions changes
  useEffect(() => {
    setXDomain([0, maxTotalSessions]);
  }, [maxTotalSessions]);
  
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

  // Use quality-specific zones for quality plot, default zones for others
  const defaultZones = plotType === "quality" ? CHART_THEME.qualityZones : CHART_THEME.zones;

  const normalizedZones: NormalizedZone[] = zones
    ? zones.map((z) => ({
        min: z.min,
        max: z.max,
        fill: z.color,
        label: z.color, // Use color as label if no label provided
      }))
    : defaultZones.map((z) => ({
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

  // Handle fullscreen
  const handleFullscreen = () => {
    if (plotType) {
      setFullscreenPlot(plotType);
    }
  };

  // Calculate distance between two touches
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Handle touch start (for pinch to zoom and two-finger pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && containerRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      
      setTouchStartDistance(distance);
      setTouchStartCenter(center);
      setTouchStartDomains({ x: [...xDomain], y: [...yDomain] });
    }
  };

  // Handle touch move (for pinch to zoom and two-finger pan)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistance && touchStartCenter && touchStartDomains && containerRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);
      
      // Calculate zoom factor
      const zoomFactor = currentDistance / touchStartDistance;
      
      // Get container dimensions
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      
      // Calculate center point in data coordinates
      const centerXPercent = (touchStartCenter.x - rect.left) / containerWidth;
      const centerYPercent = (touchStartCenter.y - rect.top) / containerHeight;
      
      // Calculate new domains with zoom centered on touch point
      const xRange = touchStartDomains.x[1] - touchStartDomains.x[0];
      const yRange = touchStartDomains.y[1] - touchStartDomains.y[0];
      
      const newXRange = xRange / zoomFactor;
      const newYRange = yRange / zoomFactor;
      
      const centerX = touchStartDomains.x[0] + xRange * centerXPercent;
      const centerY = touchStartDomains.y[0] + yRange * (1 - centerYPercent); // Y is inverted
      
      const newXDomain: [number, number] = [
        Math.max(0, centerX - newXRange * centerXPercent),
        Math.min(maxTotalSessions, centerX + newXRange * (1 - centerXPercent)),
      ];
      
      const newYDomain: [number, number] = plotType === "quality"
        ? [
            Math.max(1, centerY - newYRange * (1 - centerYPercent)),
            Math.min(5, centerY + newYRange * centerYPercent),
          ]
        : [
            Math.max(0, centerY - newYRange * (1 - centerYPercent)),
            Math.min(100, centerY + newYRange * centerYPercent),
          ];
      
      setXDomain(newXDomain);
      setYDomain(newYDomain);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setTouchStartDistance(null);
    setTouchStartCenter(null);
    setTouchStartDomains(null);
  };

  // Custom dot renderer to handle click and selection
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isSelected = payload.tutorId === selectedTutorId;

    // Responsive dot sizes: larger on mobile/tablet for better touch targets
    // Desktop: 1.5x size, Mobile/Tablet: 2x size
    const baseRadius = CHART_THEME.dot.default.r / 2;
    const dotRadius = isTouchDevice 
      ? baseRadius * 2 // 2x size for mobile/tablet
      : baseRadius * 1.5; // 1.5x size for desktop

    // Handle click with position
    const handleClick = (e: React.MouseEvent<SVGCircleElement>) => {
      e.stopPropagation();
      // Find all datapoints with the same coordinates (overlapping points)
      const tolerance = 0.001;
      const overlappingPoints = chartData.filter(
        (point) =>
          Math.abs(point.x - payload.x) < tolerance &&
          Math.abs(point.y - payload.y) < tolerance
      );
      const allTutorIds = overlappingPoints.map((point) => point.tutorId);
      
      // Use the actual click position (clientX, clientY) which is the screen position
      // This ensures the card appears directly below where the user clicked
      onDotClick(payload.tutorId, { x: e.clientX, y: e.clientY }, allTutorIds);
    };

    if (isSelected) {
      // Selected dot: blue fill, same size as non-selected
      return (
        <circle
          cx={cx}
          cy={cy}
          r={dotRadius}
          fill="#3B82F6"
          stroke="#3B82F6"
          strokeWidth={1}
          opacity={1}
          style={{ cursor: "pointer" }}
          onClick={handleClick}
          aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${plotType === "quality" ? payload.y : `${payload.y}%`}`}
        />
      );
    }

    // Non-selected dots: transparent fill with blue border, same size
    return (
      <circle
        cx={cx}
        cy={cy}
        r={dotRadius}
        fill="transparent"
        stroke="#3B82F6"
        strokeWidth={1}
        opacity={selectedTutorId ? 0.6 : 1} // Dim if another is selected
        style={{ cursor: "pointer" }}
        onClick={handleClick}
          aria-label={`Tutor ${payload.tutorId}: ${xLabel} ${payload.x}, ${yLabel} ${plotType === "quality" ? payload.y : `${payload.y}%`}`}
      />
    );
  };

  return (
    <div className="relative p-3 bg-white rounded-lg shadow-sm" style={{ outline: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
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
      <div
        ref={containerRef}
        className="relative"
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      >
        <ResponsiveContainer 
          width="100%" 
          height={isTouchDevice ? 400 : 450} 
          className="[&_svg]:outline-none [&_svg]:focus:outline-none"
        >
              <ScatterChart
                margin={{ top: 10, right: 30, bottom: 30, left: 5 }}
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
            tickFormatter={(value) => Math.round(value).toString()}
            allowDataOverflow={false}
            allowDecimals={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Add % for attendance and sessions kept plots, not for quality plot
              if (plotType === "quality") {
                return value.toFixed(1);
              }
              return `${value}%`;
            }}
            // For quality plot, show ticks at 1, 2, 3, 4, 5
            ticks={plotType === "quality" ? [1, 2, 3, 4, 5] : undefined}
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
                value: plotType === "quality" ? value.toFixed(1) : `${value}%`,
                position: "right",
                offset: 5,
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
            cursor={false}
            animationDuration={0}
            wrapperStyle={{ outline: "none" }}
            contentStyle={{ outline: "none" }}
            // Recharts Tooltip automatically follows cursor and disappears on mouse leave
            // For desktop: tooltip shows on hover, disappears after mouse leave
            // For mobile: tooltip is disabled (use tap to select instead)
            content={({ active, payload }) => {
              // Don't show tooltip on touch devices (mobile)
              if (isTouchDevice) {
                return null;
              }
              
              if (active && payload && payload[0]) {
                const hoveredData = payload[0].payload as {
                  x: number;
                  y: number;
                  tutorId: string;
                };
                
                // Find all datapoints with the same coordinates (overlapping points)
                // Use a small tolerance for floating point comparison
                const tolerance = 0.001;
                const overlappingPoints = chartData.filter(
                  (point) =>
                    Math.abs(point.x - hoveredData.x) < tolerance &&
                    Math.abs(point.y - hoveredData.y) < tolerance
                );
                
                return (
                  <div className="bg-white p-2 border border-gray-200 rounded shadow-sm max-w-xs z-50">
                    <p className="text-xs font-semibold text-gray-900 mb-1">
                      Tutor ID: {hoveredData.tutorId}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      {xLabel}: {hoveredData.x}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      {yLabel}: {plotType === "quality" ? hoveredData.y.toFixed(1) : `${hoveredData.y.toFixed(1)}%`}
                    </p>
                    {overlappingPoints.length > 1 && (
                      <p className="text-xs text-gray-500 mb-1.5">
                        {overlappingPoints.length} tutors at this point:
                      </p>
                    )}
                    {overlappingPoints.length > 1 && (
                      <div className="space-y-1">
                        {overlappingPoints.map((point, index) => (
                          <p key={index} className="text-xs font-medium">
                            {point.tutorId}
                          </p>
                        ))}
                      </div>
                    )}
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
                  fill={isSelected ? "#3B82F6" : "transparent"}
                  opacity={1}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

