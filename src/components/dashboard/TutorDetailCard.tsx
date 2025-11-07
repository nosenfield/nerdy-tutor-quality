"use client";

import { useEffect, useRef } from "react";
import { X, Star, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { useTutorDetail } from "@/lib/hooks/useDashboardData";
import { useDashboardStore } from "@/lib/stores/dashboardStore";

/**
 * Tutor Detail Card Props
 */
export interface TutorDetailCardProps {
  tutorId: string;
  position: { x: number; y: number }; // Dot coordinates in pixels
  onClose: () => void;
}

/**
 * Tutor Detail Card Component
 * 
 * Displays detailed tutor information in an overlay card near the clicked dot.
 * Positioned absolutely and stays within viewport bounds.
 */
export function TutorDetailCard({
  tutorId,
  position,
  onClose,
}: TutorDetailCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: tutorDetail, isLoading, error } = useTutorDetail(tutorId);
  const { setSessionHistoryModal } = useDashboardStore();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Ensure card stays within viewport bounds
  useEffect(() => {
    if (cardRef.current) {
      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust position if card would overflow viewport
      let left = position.x + 20; // Offset from dot
      let top = position.y - 20; // Offset from dot

      if (left + rect.width > viewportWidth) {
        left = position.x - rect.width - 20; // Show on left side
      }
      if (top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - 20; // Move up
      }
      if (top < 0) {
        top = 20; // Move down
      }
      if (left < 0) {
        left = 20; // Move right
      }

      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    }
  }, [position]);

  // Handle view session history
  const handleViewHistory = () => {
    setSessionHistoryModal(tutorId);
    onClose();
  };

  if (isLoading) {
    return (
      <div
        ref={cardRef}
        className="absolute z-50 w-80 rounded-lg bg-white shadow-xl border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !tutorDetail) {
    return (
      <div
        ref={cardRef}
        className="absolute z-50 w-80 rounded-lg bg-white shadow-xl border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Tutor Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-red-600">
          {error ? "Error loading tutor details" : "Tutor not found"}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="absolute z-50 w-80 rounded-lg bg-white shadow-xl border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2"
      style={{ left: position.x + 20, top: position.y - 20 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Tutor {tutorDetail.tutorId}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Total Sessions</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {tutorDetail.totalSessions}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Days on Platform</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {tutorDetail.daysOnPlatform}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Avg Rating</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {tutorDetail.avgRating.toFixed(1)}/5.0
            </span>
          </div>

          {tutorDetail.firstSessionAvgRating && (
            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>First Session</span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {tutorDetail.firstSessionAvgRating.toFixed(1)}/5.0
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Attendance</span>
            <span className="text-sm font-medium text-gray-900">
              {tutorDetail.attendancePercentage.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sessions Kept</span>
            <span className="text-sm font-medium text-gray-900">
              {tutorDetail.keptSessionsPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Risk Flags */}
        {tutorDetail.riskFlags.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="text-sm font-semibold text-gray-900">
                Risk Flags
              </h4>
            </div>
            <div className="space-y-2">
              {tutorDetail.riskFlags.map((flag, index) => (
                <div
                  key={index}
                  className={`text-xs px-2 py-1 rounded ${
                    flag.severity === "critical"
                      ? "bg-red-100 text-red-800"
                      : flag.severity === "high"
                      ? "bg-orange-100 text-orange-800"
                      : flag.severity === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="font-medium">{flag.type}</div>
                  <div className="text-xs opacity-75">{flag.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={handleViewHistory}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            View Session History
          </button>
        </div>
      </div>
    </div>
  );
}

