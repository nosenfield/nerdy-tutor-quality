"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useFlaggedTutors } from "@/lib/hooks/useDashboardData";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import type { TutorSummary } from "@/lib/types/dashboard";
import { CHART_THEME } from "@/lib/chart-theme";

/**
 * Table Column Definition
 */
interface TableColumn {
  id: string;
  label: string;
  sortable: boolean;
  renderCell: (tutor: TutorSummary) => React.ReactNode;
}

/**
 * Flagged Tutors Table Component
 * 
 * Displays a table of flagged tutors with mini visualizations.
 * Clicking a row highlights the tutor in the scatter plots.
 */
export function FlaggedTutorsTable() {
  const { dateRange, setSelectedTutor } = useDashboardStore();
  const { data: flaggedTutors, isLoading, error } = useFlaggedTutors(dateRange);

  // Define table columns
  const columns: TableColumn[] = useMemo(
    () => [
      {
        id: "tutorId",
        label: "Tutor ID",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <button
            onClick={() => handleRowClick(tutor.tutorId)}
            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-left"
            aria-label={`Select tutor ${tutor.tutorId}`}
          >
            {tutor.tutorId}
          </button>
        ),
      },
      {
        id: "totalSessions",
        label: "Total Sessions",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <span className="text-gray-900">{tutor.totalSessions}</span>
        ),
      },
      {
        id: "attendancePercentage",
        label: "Attendance %",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[80px]">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${tutor.attendancePercentage}%`,
                    backgroundColor:
                      tutor.attendancePercentage >= 90
                        ? CHART_THEME.colors.safe
                        : tutor.attendancePercentage >= 70
                        ? CHART_THEME.colors.warning
                        : CHART_THEME.colors.risk,
                  }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-700 min-w-[45px] text-right">
              {tutor.attendancePercentage.toFixed(1)}%
            </span>
          </div>
        ),
      },
      {
        id: "keptSessionsPercentage",
        label: "Sessions Kept %",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[80px]">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${tutor.keptSessionsPercentage}%`,
                    backgroundColor:
                      tutor.keptSessionsPercentage >= 85
                        ? CHART_THEME.colors.safe
                        : tutor.keptSessionsPercentage >= 60
                        ? CHART_THEME.colors.warning
                        : CHART_THEME.colors.risk,
                  }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-700 min-w-[45px] text-right">
              {tutor.keptSessionsPercentage.toFixed(1)}%
            </span>
          </div>
        ),
      },
      {
        id: "avgRating",
        label: "Avg Rating",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm ${
                    star <= Math.round(tutor.avgRating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-700 ml-1">
              {tutor.avgRating.toFixed(1)}
            </span>
          </div>
        ),
      },
      {
        id: "daysOnPlatform",
        label: "Days on Platform",
        sortable: true,
        renderCell: (tutor: TutorSummary) => (
          <span className="text-gray-900">{tutor.daysOnPlatform}</span>
        ),
      },
    ],
    []
  );

  // Handle row click to highlight tutor in scatter plots
  const handleRowClick = (tutorId: string) => {
    setSelectedTutor(tutorId);
  };

  // Determine row background color based on risk flags
  const getRowClassName = (tutor: TutorSummary): string => {
    const flagCount = tutor.riskFlags.length;
    if (flagCount >= 2) {
      return "bg-red-50 hover:bg-red-100 border-l-4 border-red-500";
    } else if (flagCount === 1) {
      return "bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-500";
    }
    return "bg-white hover:bg-gray-50";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 text-sm">Loading flagged tutors...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to load flagged tutors
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : "Unable to fetch flagged tutors. Please try again."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!flaggedTutors || flaggedTutors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              No flagged tutors found for the selected date range.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Flagged Tutors
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {flaggedTutors.length} tutor{flaggedTutors.length !== 1 ? "s" : ""}{" "}
          flagged for review
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full divide-y divide-gray-200"
          role="table"
          aria-label="Flagged tutors table"
        >
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Risk Flags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flaggedTutors.map((tutor) => (
              <tr
                key={tutor.tutorId}
                onClick={() => handleRowClick(tutor.tutorId)}
                className={`cursor-pointer transition-colors ${getRowClassName(
                  tutor
                )}`}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(tutor.tutorId);
                  }
                }}
                aria-label={`Tutor ${tutor.tutorId}, ${tutor.riskFlags.length} risk flag${tutor.riskFlags.length !== 1 ? "s" : ""}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 whitespace-nowrap text-sm"
                  >
                    {column.renderCell(tutor)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {tutor.riskFlags.length > 0 && (
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          tutor.riskFlags.length >= 2
                            ? "text-red-500"
                            : "text-amber-500"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-xs text-gray-600">
                      {tutor.riskFlags.length > 0
                        ? tutor.riskFlags.join(", ")
                        : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

