"use client";

import { Fragment, useState, useMemo } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { X, Download, ChevronDown, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTutorSessionHistory, useTutorDetail } from "@/lib/hooks/useDashboardData";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import type { DateRange } from "@/lib/types/dashboard";

/**
 * Session data structure from API
 */
interface SessionData {
  id: string;
  date: Date | string;
  subject: string;
  rating: number | null;
  attendanceStatus: "on-time" | "late" | "no-show";
  rescheduled: boolean;
  rescheduledBy: "tutor" | "student" | null;
  isFirstSession: boolean;
}

/**
 * Session History Modal Component
 * 
 * Displays detailed session history for a selected tutor.
 * Includes filters, sorting, pagination, and export functionality.
 */
export function SessionHistoryModal() {
  const router = useRouter();
  const { sessionHistoryTutorId, setSessionHistoryModal, dateRange } = useDashboardStore();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<"date" | "rating" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<"all" | "first">("all");

  // Reset page when filters change
  const handleSubjectFilterChange = (value: string | null) => {
    setSubjectFilter(value);
    setPage(1);
  };

  const handleSessionTypeFilterChange = (value: "all" | "first") => {
    setSessionTypeFilter(value);
    setPage(1);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const isOpen = sessionHistoryTutorId !== null;

  const handleClose = () => {
    setSessionHistoryModal(null);
    // Reset filters when closing
    setPage(1);
    setLimit(50);
    setSortBy("date");
    setSortDirection("desc");
    setSubjectFilter(null);
    setSessionTypeFilter("all");
  };

  // Fetch tutor detail for header
  const { data: tutorDetail } = useTutorDetail(
    sessionHistoryTutorId || "",
    dateRange
  );

  // Fetch session history
  const { data: sessionsResponse, isLoading, error } = useTutorSessionHistory(
    sessionHistoryTutorId || "",
    dateRange,
    page,
    limit
  );

  const sessions: SessionData[] = sessionsResponse?.sessions || [];
  const totalSessions = sessionsResponse?.total || 0;
  const totalPages = Math.ceil(totalSessions / limit);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Filter by subject
    if (subjectFilter) {
      filtered = filtered.filter((s) => s.subject === subjectFilter);
    }

    // Filter by session type
    if (sessionTypeFilter === "first") {
      filtered = filtered.filter((s) => s.isFirstSession);
    }

    return filtered;
  }, [sessions, subjectFilter, sessionTypeFilter]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          comparison = dateA - dateB;
          break;
        case "rating":
          const ratingA = a.rating ?? 0;
          const ratingB = b.rating ?? 0;
          comparison = ratingA - ratingB;
          break;
        case "status":
          const statusOrder = { "on-time": 0, late: 1, "no-show": 2 };
          comparison =
            statusOrder[a.attendanceStatus] - statusOrder[b.attendanceStatus];
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSessions, sortBy, sortDirection]);

  // Get unique subjects for filter
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(sessions.map((s) => s.subject));
    return Array.from(subjects).sort();
  }, [sessions]);

  // Handle export
  const handleExport = () => {
    if (sortedSessions.length === 0) return;

    // Create CSV content
    const headers = [
      "Date",
      "Subject",
      "Rating",
      "Attendance Status",
      "Rescheduled",
      "Rescheduled By",
      "First Session",
    ];
    const rows = sortedSessions.map((session) => [
      format(new Date(session.date), "yyyy-MM-dd HH:mm:ss"),
      session.subject,
      session.rating?.toString() || "",
      session.attendanceStatus,
      session.rescheduled ? "Yes" : "No",
      session.rescheduledBy || "",
      session.isFirstSession ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tutor-${sessionHistoryTutorId}-sessions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get attendance status color
  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case "on-time":
        return "bg-green-100 text-green-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "no-show":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle sort click
  const handleSortClick = (column: "date" | "rating" | "status") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  if (!sessionHistoryTutorId) {
    return null;
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
        aria-labelledby="session-history-title"
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-6xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div>
                    <Dialog.Title
                      id="session-history-title"
                      className="text-xl font-semibold text-gray-900"
                    >
                      Session History
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      Tutor ID:{" "}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sessionHistoryTutorId) {
                            router.push(`/dashboard/tutors/${sessionHistoryTutorId}`);
                            handleClose();
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                        aria-label={`View details for tutor ${sessionHistoryTutorId}`}
                      >
                        {sessionHistoryTutorId}
                      </button>
                      {tutorDetail && (
                        <span className="ml-2">
                          • {tutorDetail.totalSessions} total sessions
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={sortedSessions.length === 0}
                      className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Export to CSV"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-label="Close modal"
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Subject Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Subject:
                      </label>
                      <Listbox value={subjectFilter} onChange={handleSubjectFilterChange}>
                        <div className="relative">
                          <Listbox.Button className="relative w-40 cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm">
                            <span className="block truncate">
                              {subjectFilter || "All Subjects"}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              <Listbox.Option
                                value={null}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                                    active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                  }`
                                }
                              >
                                All Subjects
                              </Listbox.Option>
                              {uniqueSubjects.map((subject) => (
                                <Listbox.Option
                                  key={subject}
                                  value={subject}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                                      active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                    }`
                                  }
                                >
                                  {subject}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>

                    {/* Session Type Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Type:
                      </label>
                      <Listbox value={sessionTypeFilter} onChange={handleSessionTypeFilterChange}>
                        <div className="relative">
                          <Listbox.Button className="relative w-32 cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm">
                            <span className="block truncate">
                              {sessionTypeFilter === "first" ? "First Sessions" : "All Sessions"}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              <Listbox.Option
                                value="all"
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                                    active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                  }`
                                }
                              >
                                All Sessions
                              </Listbox.Option>
                              <Listbox.Option
                                value="first"
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                                    active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                  }`
                                }
                              >
                                First Sessions
                              </Listbox.Option>
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>

                    {/* Rows per page */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        Rows:
                      </label>
                      <Listbox value={limit} onChange={handleLimitChange}>
                        <div className="relative">
                          <Listbox.Button className="relative w-20 cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm">
                            <span className="block truncate">{limit}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {[25, 50, 100].map((option) => (
                                <Listbox.Option
                                  key={option}
                                  value={option}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                                      active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                                    }`
                                  }
                                >
                                  {option}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-500 text-sm">Loading sessions...</div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">
                        Failed to load sessions. Please try again.
                      </p>
                    </div>
                  ) : sortedSessions.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-500 text-sm">No sessions found.</p>
                    </div>
                  ) : (
                    <>
                      {/* Session Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSortClick("date")}
                              >
                                <div className="flex items-center gap-1">
                                  Date/Time
                                  {sortBy === "date" && (
                                    <span className="text-gray-400">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Subject
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSortClick("rating")}
                              >
                                <div className="flex items-center gap-1">
                                  Rating
                                  {sortBy === "rating" && (
                                    <span className="text-gray-400">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSortClick("status")}
                              >
                                <div className="flex items-center gap-1">
                                  Status
                                  {sortBy === "status" && (
                                    <span className="text-gray-400">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Rescheduled
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                First Session
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortedSessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {format(new Date(session.date), "MMM d, yyyy h:mm a")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {session.subject}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {session.rating ? (
                                    <div className="flex items-center gap-1">
                                      <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`h-4 w-4 ${
                                              star <= Math.round(session.rating!)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300"
                                            }`}
                                            aria-hidden="true"
                                          />
                                        ))}
                                      </div>
                                      <span className="text-gray-700">
                                        {session.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getAttendanceStatusColor(
                                      session.attendanceStatus
                                    )}`}
                                  >
                                    {session.attendanceStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {session.rescheduled ? (
                                    <span>
                                      Yes
                                      {session.rescheduledBy && (
                                        <span className="text-gray-500 ml-1">
                                          (by {session.rescheduledBy})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">No</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {session.isFirstSession ? (
                                    <span className="inline-flex rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                                      First
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                          <div className="text-sm text-gray-700">
                            Showing {(page - 1) * limit + 1}-
                            {Math.min(page * limit, totalSessions)} of {totalSessions}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPage(Math.max(1, page - 1))}
                              disabled={page === 1}
                              className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Previous page"
                            >
                              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <span className="text-sm text-gray-700">
                              Page {page} of {totalPages}
                            </span>
                            <button
                              onClick={() => setPage(Math.min(totalPages, page + 1))}
                              disabled={page === totalPages}
                              className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Next page"
                            >
                              <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

