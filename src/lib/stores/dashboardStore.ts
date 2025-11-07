/**
 * Dashboard Store
 * 
 * Zustand store for dashboard UI state only.
 * Data fetching is handled by TanStack Query, not Zustand.
 */

import { create } from "zustand";
import type { DateRange } from "@/lib/types/dashboard";

interface DashboardStore {
  // Date range filter
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Selected tutor
  selectedTutorId: string | null;
  setSelectedTutor: (id: string | null) => void;

  // Table state
  tableSort: { column: string; direction: "asc" | "desc" } | null;
  setTableSort: (column: string | null) => void;
  tablePage: number;
  setTablePage: (page: number) => void;
  rowsPerPage: 10 | 25 | 50 | 100;
  setRowsPerPage: (rows: 10 | 25 | 50 | 100) => void;

  // Modal state
  fullscreenPlot: "attendance" | "reschedules" | "quality" | null;
  setFullscreenPlot: (
    plot: "attendance" | "reschedules" | "quality" | null
  ) => void;

  // Session history modal
  sessionHistoryTutorId: string | null;
  setSessionHistoryModal: (id: string | null) => void;

  // First session quality toggle (for quality plot)
  qualityView: "all" | "first";
  setQualityView: (view: "all" | "first") => void;

  // Data source preference
  forceMockData: boolean;
  setForceMockData: (force: boolean) => void;

  // Last refresh timestamp
  lastRefreshAt: Date | null;
  setLastRefreshAt: (date: Date | null) => void;
}

/**
 * Default date range: Last month
 */
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start, end };
}

/**
 * Dashboard Zustand store
 */
export const useDashboardStore = create<DashboardStore>((set) => ({
  // Date range filter
  dateRange: getDefaultDateRange(),
  setDateRange: (range) => set({ dateRange: range }),

  // Selected tutor
  selectedTutorId: null,
  setSelectedTutor: (id) => set({ selectedTutorId: id }),

  // Table state
  tableSort: null,
  setTableSort: (column) =>
    set((state) => {
      if (!column) {
        return { tableSort: null };
      }
      if (state.tableSort?.column === column) {
        // Toggle direction: asc -> desc -> null
        if (state.tableSort.direction === "asc") {
          return { tableSort: { column, direction: "desc" } };
        }
        return { tableSort: null };
      }
      return { tableSort: { column, direction: "asc" } };
    }),
  tablePage: 1,
  setTablePage: (page) => set({ tablePage: page }),
  rowsPerPage: 25,
  setRowsPerPage: (rows) => set({ rowsPerPage: rows }),

  // Modal state
  fullscreenPlot: null,
  setFullscreenPlot: (plot) => set({ fullscreenPlot: plot }),

  // Session history modal
  sessionHistoryTutorId: null,
  setSessionHistoryModal: (id) => set({ sessionHistoryTutorId: id }),

  // First session quality toggle
  qualityView: "all",
  setQualityView: (view) => set({ qualityView: view }),

  // Data source preference
  forceMockData: false,
  setForceMockData: (force) => set({ forceMockData: force }),

  // Last refresh timestamp
  lastRefreshAt: null,
  setLastRefreshAt: (date) => set({ lastRefreshAt: date }),
}));

