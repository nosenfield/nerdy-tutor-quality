"use client";

import { CheckCircle, Clock, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TutorDetailResponse } from "@/lib/hooks/useTutorDetailData";

interface RecentSessionsTableProps {
  sessions: TutorDetailResponse["recent_sessions"];
}

/**
 * Get session status badge
 */
function getSessionStatus(session: TutorDetailResponse["recent_sessions"][0]) {
  // Check if no-show (no session_end_time)
  if (!session.session_end_time) {
    return {
      icon: <XCircle className="h-4 w-4" />,
      label: "No-Show",
      color: "text-red-600",
      bg: "bg-red-50",
    };
  }

  // Check if late (tutor_join_time > session_start_time)
  const sessionStart = session.session_start_time ? parseISO(session.session_start_time) : null;
  const tutorJoin = session.tutor_join_time ? parseISO(session.tutor_join_time) : null;
  const isLate = tutorJoin && sessionStart ? tutorJoin > sessionStart : false;

  if (isLate && sessionStart && tutorJoin) {
    const minutesLate = Math.floor(
      (tutorJoin.getTime() - sessionStart.getTime()) / (1000 * 60)
    );
    return {
      icon: <Clock className="h-4 w-4" />,
      label: `${minutesLate} min late`,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    };
  }

  return {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Completed",
    color: "text-green-600",
    bg: "bg-green-50",
  };
}

/**
 * Format duration
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Recent Sessions Table Component
 * 
 * Displays table of recent sessions for the tutor.
 * Task 4.19
 */
export function RecentSessionsTable({
  sessions,
}: RecentSessionsTableProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Sessions
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>No recent sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
        <span className="text-sm text-gray-600">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              const sessionDate = session.session_start_time ? parseISO(session.session_start_time) : new Date();

              return (
                <tr key={session.session_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {format(sessionDate, "MMM d, yyyy")}
                    <br />
                    <span className="text-xs text-gray-500">
                      {format(sessionDate, "h:mm a")}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    #{session.student_id}
                    {session.is_first_session && (
                      <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        First
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {session.student_feedback_rating ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {session.student_feedback_rating.toFixed(1)}
                        </span>
                        <span className="text-yellow-500">⭐</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color} ${status.bg}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(session.session_length_actual || session.session_length_scheduled)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

