"use client";

import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface TutorHeaderProps {
  tutorId: string;
  currentScore: TutorDetailResponse["current_score"];
  activeFlagsCount: number;
  recentSessionsCount: number;
}

/**
 * Get score color based on overall score
 */
function getScoreColor(score: number): {
  bg: string;
  text: string;
  badge: string;
  progress: string;
} {
  if (score >= 81) {
    return {
      bg: "bg-green-50",
      text: "text-green-600",
      badge: "🟢",
      progress: "bg-green-500",
    };
  } else if (score >= 51) {
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-600",
      badge: "🟡",
      progress: "bg-yellow-500",
    };
  } else {
    return {
      bg: "bg-red-50",
      text: "text-red-600",
      badge: "🔴",
      progress: "bg-red-500",
    };
  }
}

/**
 * Get confidence level text
 */
function getConfidenceLevel(confidenceScore: number | null): string {
  if (confidenceScore === null) return "Unknown";
  if (confidenceScore >= 0.8) return "High";
  if (confidenceScore >= 0.5) return "Medium";
  return "Low";
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
}: TutorHeaderProps) {
  const overallScore = currentScore?.overall_score ?? 0;
  const scoreColor = getScoreColor(overallScore);
  const confidenceLevel = getConfidenceLevel(currentScore?.confidence_score ?? null);
  const lastSessionDate = currentScore?.window_end 
    ? new Date(currentScore.window_end).toISOString()
    : null;
  const daysSinceLastSession = getDaysSinceLastSession(lastSessionDate);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Tutor #{tutorId}</h2>
          <p className="text-sm text-gray-600 mb-4">Tutor ID: {tutorId}</p>

          <div className="flex items-center gap-6 mt-4">
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
            <div className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              <div>
                <p className="text-xs text-gray-500">Confidence</p>
                <p className="text-sm font-medium text-green-600">
                  {confidenceLevel} ({currentScore?.total_sessions ?? 0}+ sessions)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-600 mb-2">Overall Score</p>
          <div className="flex items-center gap-3">
            <div className={`text-5xl font-bold ${scoreColor.text}`}>{overallScore}</div>
            <div>
              <span className="text-3xl">{scoreColor.badge}</span>
              <p className={`text-sm font-medium mt-1 ${
                overallScore < 51 ? "text-red-600" : overallScore >= 81 ? "text-green-600" : "text-gray-600"
              }`}>
                {overallScore < 51 ? "Declining ↓" : overallScore >= 81 ? "Improving ↑" : "Stable →"}
              </p>
            </div>
          </div>
          <div className="mt-2 w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreColor.progress || "bg-yellow-500"}`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

