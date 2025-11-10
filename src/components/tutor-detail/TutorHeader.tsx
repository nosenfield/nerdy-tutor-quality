"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";
import type { ScoreBreakdownResponse } from "@/lib/hooks/useTutorScoreBreakdown";

interface TutorHeaderProps {
  tutorId: string;
  currentScore: TutorDetailResponse["current_score"];
  activeFlagsCount: number;
  recentSessionsCount: number;
  scoreBreakdown?: ScoreBreakdownResponse["breakdown"];
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
 * Get days since last session
 */
function getDaysSinceLastSession(lastSessionDate: string | null): string {
  if (!lastSessionDate) return "Never";
  
  const lastSession = new Date(lastSessionDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastSession.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

/**
 * Tutor Header Component
 * 
 * Displays tutor identity, overall score, and quick stats.
 * Task 4.15
 */
export function TutorHeader({
  tutorId,
  currentScore,
  activeFlagsCount,
  recentSessionsCount,
  scoreBreakdown,
  performanceHistory,
}: TutorHeaderProps) {
  const lastSessionDate = currentScore?.window_end 
    ? new Date(currentScore.window_end).toISOString()
    : null;
  const daysSinceLastSession = getDaysSinceLastSession(lastSessionDate);

  const scores = scoreBreakdown ? [
    {
      label: "Attendance",
      value: scoreBreakdown.attendance,
      description: "Based on no-shows and lateness",
    },
    {
      label: "Ratings",
      value: scoreBreakdown.ratings,
      description: "Based on average student ratings",
    },
    {
      label: "Reliability",
      value: scoreBreakdown.reliability,
      description: "Based on reschedule rate",
    },
  ] : [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-xs text-gray-500">Total Sessions</p>
            <p className="text-lg font-semibold text-gray-900">
              {currentScore?.total_sessions ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚩</span>
          <div>
            <p className="text-xs text-gray-500">Active Flags</p>
            <p className="text-lg font-semibold text-red-600">
              {activeFlagsCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-xs text-gray-500">Last Session</p>
            <p className="text-sm font-medium text-gray-900">{daysSinceLastSession}</p>
          </div>
        </div>

        {/* Score Breakdown Cards - Inline (excluding Ratings) */}
        {scores.filter((score) => score.label !== "Ratings").map((score) => {
          const colors = getScoreColor(score.value);
          const trend = getTrend(score.value, performanceHistory);

          return (
            <div
              key={score.label}
              className="flex items-center gap-2"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-500">{score.label}</p>
                  {trend && (
                    <div className="flex items-center">
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
                <p className={`${colors.text} text-lg font-bold`}>
                  {Math.round(score.value)}/100
                </p>
              </div>
            </div>
          );
        })}

        {/* Ratings Scorecard - Far Right */}
        {scores.find((score) => score.label === "Ratings") && (() => {
          const ratingScore = scores.find((score) => score.label === "Ratings")!;
          const colors = getScoreColor(ratingScore.value);
          const trend = getTrend(ratingScore.value, performanceHistory);

          // For ratings, convert 0-100 score back to 1-5 scale
          // Formula: score = ((rating - 1) / 4) * 100
          // Reverse: rating = (score / 100) * 4 + 1
          let rating: number;
          if (currentScore?.avg_student_rating !== null && currentScore?.avg_student_rating !== undefined) {
            rating = Number(currentScore.avg_student_rating);
          } else {
            // Convert 0-100 score back to 1-5 rating
            rating = (ratingScore.value / 100) * 4 + 1;
          }
          const displayValue = rating.toFixed(1);

          return (
            <div className="flex items-center gap-2 ml-auto">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-500">{ratingScore.label}</p>
                  {trend && (
                    <div className="flex items-center">
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
                <p className={`${colors.text} text-lg font-bold`}>
                  {displayValue}/5
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

