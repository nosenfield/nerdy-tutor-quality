"use client";

import { RadioGroup } from "@headlessui/react";
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
    <div className="relative">
      {/* Toggle Control */}
      <div className="absolute top-6 right-6 z-10">
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
                  All Sessions
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
                  First Only
                </button>
              )}
            </RadioGroup.Option>
          </div>
        </RadioGroup>
      </div>

      {/* Scatter Plot */}
      <ScatterPlot
        title={title}
        data={currentData}
        xLabel={xLabel}
        yLabel={yLabel}
        onDotClick={onDotClick}
        selectedTutorId={selectedTutorId}
        zones={zones}
      />
    </div>
  );
}

