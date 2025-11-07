"use client";

import { ScatterPlot } from "./ScatterPlot";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import type { ScatterPlotDataPoint } from "@/lib/types/dashboard";

/**
 * Quality Plot Component Props
 */
export interface QualityPlotProps {
  title: string;
  allSessionsData: ScatterPlotDataPoint[];
  firstSessionsData: ScatterPlotDataPoint[];
  xLabel: string;
  onDotClick: (tutorId: string) => void;
  selectedTutorId?: string | null;
  zones?: Array<{ min: number; max: number; color: string }>;
  plotType?: "attendance" | "reschedules" | "quality";
}

/**
 * Quality Plot Component
 * 
 * Wraps ScatterPlot with a toggle to switch between all sessions and first sessions only.
 * Uses Zustand store to persist toggle state.
 */
export function QualityPlot({
  title,
  allSessionsData,
  firstSessionsData,
  xLabel,
  onDotClick,
  selectedTutorId,
  zones,
  plotType,
}: QualityPlotProps) {
  const { qualityView, setQualityView } = useDashboardStore();

  // Select data based on current view
  const currentData =
    qualityView === "first" ? firstSessionsData : allSessionsData;
  const yLabel =
    qualityView === "first"
      ? "First Session Rating %"
      : "Average Rating %";

  return (
    <ScatterPlot
      title={title}
      data={currentData}
      xLabel={xLabel}
      yLabel={yLabel}
      onDotClick={onDotClick}
      selectedTutorId={selectedTutorId}
      zones={zones}
      plotType={plotType}
    />
  );
}

