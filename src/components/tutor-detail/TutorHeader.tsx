"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, AlertCircle, Clock } from "lucide-react";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";
import { format } from "date-fns";

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
} {
  if (score >= 81) {
    return {
      bg: "bg-green-50",
      text: "text-green-800",
      badge: "🟢",
    };
  } else if (score >= 51) {
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      badge: "🟡",
    };
  } else {
    return {
      bg: "bg-red-50",
      text: "text-red-800",
      badge: "🔴",
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
  const router = useRouter();
  const overallScore = currentScore?.overall_score ?? 0;
  const scoreColor = getScoreColor(overallScore);
  const confidenceLevel = getConfidenceLevel(currentScore?.confidence_score ?? null);
  const lastSessionDate = currentScore?.window_end 
    ? new Date(currentScore.window_end).toISOString()
    : null;
  const daysSinceLastSession = getDaysSinceLastSession(lastSessionDate);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-sm p-6 text-white mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">Tutor #{tutorId}</h1>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            {/* Overall Score */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-sm opacity-90 mb-1">Overall Score</div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{overallScore}</span>
                <span className="text-lg">/100</span>
                <span className="text-xl">{scoreColor.badge}</span>
              </div>
            </div>

            {/* Confidence Level */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-sm opacity-90 mb-1">Confidence</div>
              <div className="text-lg font-semibold">{confidenceLevel}</div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 opacity-80" />
            <span className="text-sm opacity-90">Total Sessions</span>
          </div>
          <div className="text-xl font-semibold">
            {currentScore?.total_sessions ?? 0}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 opacity-80" />
            <span className="text-sm opacity-90">Active Flags</span>
          </div>
          <div className="text-xl font-semibold">{activeFlagsCount}</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 opacity-80" />
            <span className="text-sm opacity-90">Last Session</span>
          </div>
          <div className="text-xl font-semibold">{daysSinceLastSession}</div>
        </div>
      </div>
    </div>
  );
}

