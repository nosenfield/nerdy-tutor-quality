"use client";

import { AlertCircle, AlertTriangle, AlertCircle as AlertCircleIcon } from "lucide-react";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface ActiveFlagsListProps {
  flags: TutorDetailResponse["active_flags"];
  tutorId: string;
}

/**
 * Get severity badge styling
 */
function getSeverityBadge(severity: "critical" | "high" | "medium" | "low") {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        icon: "🔴",
        label: "Critical",
      };
    case "high":
      return {
        bg: "bg-orange-100",
        text: "text-orange-800",
        border: "border-orange-300",
        icon: "🟠",
        label: "High",
      };
    case "medium":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        icon: "🟡",
        label: "Medium",
      };
    case "low":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-300",
        icon: "🔵",
        label: "Low",
      };
  }
}

/**
 * Get days since flag was raised
 */
function getDaysSince(dateString: string): string {
  const date = parseISO(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

/**
 * Active Flags List Component
 * 
 * Displays list of active flags for the tutor.
 * Task 4.18
 */
export function ActiveFlagsList({ flags, tutorId }: ActiveFlagsListProps) {
  if (!flags || flags.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Active Flags
        </h2>
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No active flags</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Active Flags</h2>
        <span className="text-sm text-gray-600">
          {flags.length} {flags.length === 1 ? "flag" : "flags"}
        </span>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => {
          const badge = getSeverityBadge(flag.severity);
          const daysSince = getDaysSince(flag.created_at);

          return (
            <div
              key={flag.id}
              className={`${badge.bg} ${badge.border} border rounded-lg p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{badge.icon}</span>
                  <span
                    className={`${badge.text} text-sm font-semibold px-2 py-1 rounded`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {flag.title}
                  </span>
                </div>
                <span className="text-xs text-gray-600">{daysSince}</span>
              </div>

              <p className="text-sm text-gray-700 mb-2">{flag.description}</p>

              {flag.recommended_action && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Recommended Action:
                  </p>
                  <p className="text-xs text-gray-700">
                    {flag.recommended_action}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  View Details
                </button>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">
                  Raised: {format(parseISO(flag.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

