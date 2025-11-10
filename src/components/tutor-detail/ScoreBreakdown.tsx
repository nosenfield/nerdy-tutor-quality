"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScoreBreakdownResponse } from "@/lib/hooks/useTutorScoreBreakdown";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownResponse["breakdown"];
  performanceHistory?: Array<{
    calculated_at: string;
    overall_score: number;
  }>;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  progress: string;
} {
  if (score >= 81) {
    return {
      bg: "bg-green-50",
      text: "text-green-800",
      border: "border-green-200",
      progress: "bg-green-500",
    };
  } else if (score >= 51) {
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      border: "border-yellow-200",
      progress: "bg-yellow-500",
    };
  } else {
    return {
      bg: "bg-red-50",
      text: "text-red-800",
      border: "border-red-200",
      progress: "bg-red-500",
    };
  }
}

/**
 * Calculate trend indicator
 * 
 * Compares current score with previous score from performance history
 */
function getTrend(
  currentScore: number,
  performanceHistory?: Array<{ calculated_at: string; overall_score: number }>
): "improving" | "declining" | "stable" | null {
  if (!performanceHistory || performanceHistory.length < 2) {
    return null;
  }

  // Get previous score (second most recent)
  const previousScore = performanceHistory[1]?.overall_score ?? currentScore;
  const diff = currentScore - previousScore;

  if (diff > 2) return "improving";
  if (diff < -2) return "declining";
  return "stable";
}

/**
 * Score Breakdown Component
 * 
 * Displays four component scores (attendance, ratings, completion, reliability)
 * with visual progress bars and trend indicators.
 * Task 4.16
 */
export function ScoreBreakdown({
  breakdown,
  performanceHistory,
}: ScoreBreakdownProps) {
  const scores = [
    {
      label: "Attendance",
      value: breakdown.attendance,
      description: "Based on no-shows and lateness",
    },
    {
      label: "Ratings",
      value: breakdown.ratings,
      description: "Based on average student ratings",
    },
    {
      label: "Completion",
      value: breakdown.completion,
      description: "Based on early-end sessions",
    },
    {
      label: "Reliability",
      value: breakdown.reliability,
      description: "Based on reschedule rate",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Score Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {scores.map((score) => {
          const colors = getScoreColor(score.value);
          const trend = getTrend(score.value, performanceHistory);

          return (
            <div
              key={score.label}
              className={`${colors.bg} ${colors.border} border rounded-lg p-3`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-700">
                  {score.label}
                </div>
                {trend && (
                  <div className="flex items-center gap-1">
                    {trend === "improving" && (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    )}
                    {trend === "declining" && (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    {trend === "stable" && (
                      <Minus className="h-3 w-3 text-gray-600" />
                    )}
                  </div>
                )}
              </div>
              <div className={`${colors.text} text-xl font-bold mb-1.5`}>
                {Math.round(score.value)}/100
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
                <div
                  className={`${colors.progress} h-1.5 rounded-full transition-all duration-300`}
                  style={{ width: `${score.value}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 leading-tight">{score.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

