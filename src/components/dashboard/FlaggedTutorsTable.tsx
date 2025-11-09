"use client";

import { useMemo, useEffect } from "react";
import { AlertTriangle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Listbox, Transition } from "@headlessui/react";
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
  const { 
    dateRange, 
    setSelectedTutor,
    tableSort,
    setTableSort,
    tablePage,
    setTablePage,
    rowsPerPage,
    setRowsPerPage
  } = useDashboardStore();
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

  // Handle column header click for sorting
  const handleSortClick = (columnId: string) => {
    setTableSort(columnId);
    // Reset to page 1 when sort changes
    if (tablePage !== 1) {
      setTablePage(1);
    }
  };

  // Sort function
  const sortData = (data: TutorSummary[]): TutorSummary[] => {
    if (!tableSort) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (tableSort.column) {
        case "tutorId":
          aValue = a.tutorId;
          bValue = b.tutorId;
          break;
        case "totalSessions":
          aValue = a.totalSessions;
          bValue = b.totalSessions;
          break;
        case "attendancePercentage":
          aValue = a.attendancePercentage;
          bValue = b.attendancePercentage;
          break;
        case "keptSessionsPercentage":
          aValue = a.keptSessionsPercentage;
          bValue = b.keptSessionsPercentage;
          break;
        case "avgRating":
          aValue = a.avgRating;
          bValue = b.avgRating;
          break;
        case "daysOnPlatform":
          aValue = a.daysOnPlatform;
          bValue = b.daysOnPlatform;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Compare values
      if (typeof aValue === "string" && typeof bValue === "string") {
        return tableSort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numeric comparison
      const comparison = (aValue as number) - (bValue as number);
      return tableSort.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  // Sort and paginate data
  const sortedData = useMemo(() => {
    if (!flaggedTutors) return [];
    return sortData(flaggedTutors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedTutors, tableSort]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / rowsPerPage);
  }, [sortedData.length, rowsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (tablePage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, tablePage, rowsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && tablePage > totalPages) {
      setTablePage(1);
    }
  }, [totalPages, tablePage, setTablePage]);

  // Reset to page 1 when rowsPerPage changes
  useEffect(() => {
    if (tablePage > 1) {
      setTablePage(1);
    }
  }, [rowsPerPage, setTablePage]);

  // Get sort indicator for a column
  const getSortIndicator = (columnId: string) => {
    if (!tableSort || tableSort.column !== columnId) {
      return null;
    }
    return tableSort.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 inline-block ml-1" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-4 w-4 inline-block ml-1" aria-hidden="true" />
    );
  };

  // Get aria-sort attribute for accessibility
  const getAriaSort = (columnId: string): "ascending" | "descending" | "none" | undefined => {
    if (!tableSort || tableSort.column !== columnId) {
      return "none";
    }
    return tableSort.direction === "asc" ? "ascending" : "descending";
  };

  // Calculate page numbers to display (show up to 5 at a time)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, tablePage - 1);
      let end = Math.min(totalPages - 1, tablePage + 1);

      // Adjust if we're near the start
      if (tablePage <= 3) {
        start = 2;
        end = 4;
      }
      // Adjust if we're near the end
      else if (tablePage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      // Add ellipsis before if needed
      if (start > 2) {
        pages.push("ellipsis");
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis after if needed
      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
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

  const pageNumbers = getPageNumbers();
  const startIndex = (tablePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, sortedData.length);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Flagged Tutors
        </h2>
        <p className="text-sm text-gray-700">
          Showing {startIndex + 1}-{endIndex} of {sortedData.length} tutors
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full divide-y divide-gray-200"
          role="table"
          aria-label="Flagged tutors table"
        >
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={column.sortable ? getAriaSort(column.id) : undefined}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable
                      ? "cursor-pointer hover:bg-gray-100 select-none"
                      : ""
                  }`}
                  onClick={column.sortable ? () => handleSortClick(column.id) : undefined}
                  onKeyDown={
                    column.sortable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortClick(column.id);
                          }
                        }
                      : undefined
                  }
                  tabIndex={column.sortable ? 0 : undefined}
                  role={column.sortable ? "button" : undefined}
                  aria-label={
                    column.sortable
                      ? `Sort by ${column.label}${
                          tableSort?.column === column.id
                            ? ` ${tableSort.direction === "asc" ? "ascending" : "descending"}`
                            : ""
                        }`
                      : undefined
                  }
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && getSortIndicator(column.id)}
                  </div>
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
            {paginatedData.map((tutor) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Rows per page dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Rows per page:</span>
              <Listbox value={rowsPerPage} onChange={setRowsPerPage}>
                <div className="relative">
                  <Listbox.Button className="relative w-20 cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm">
                    <span className="block truncate">{rowsPerPage}</span>
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
                      {[10, 25, 50, 100].map((option) => (
                        <Listbox.Option
                          key={option}
                          value={option}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-3 pr-4 ${
                              active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {option}
                              </span>
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>

            {/* Page indicator */}
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1}-{endIndex} of {sortedData.length}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              {/* Previous button */}
              <button
                onClick={() => setTablePage(Math.max(1, tablePage - 1))}
                disabled={tablePage === 1}
                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Page number buttons */}
              {pageNumbers.map((page, index) => {
                if (page === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => setTablePage(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                      tablePage === page
                        ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        : "text-gray-900 hover:bg-gray-50"
                    }`}
                    aria-label={`Page ${page}`}
                    aria-current={tablePage === page ? "page" : undefined}
                  >
                    {page}
                  </button>
                );
              })}

              {/* Next button */}
              <button
                onClick={() => setTablePage(Math.min(totalPages, tablePage + 1))}
                disabled={tablePage === totalPages}
                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

