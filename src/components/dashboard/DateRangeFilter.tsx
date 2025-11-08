"use client";

import { Listbox, Transition, RadioGroup } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  subDays,
  subMonths,
  subQuarters,
  startOfToday,
  endOfToday,
} from "date-fns";
import { useDashboardStore } from "@/lib/stores/dashboardStore";
import type { DateRange } from "@/lib/types/dashboard";
import { Fragment } from "react";

/**
 * Date Range Filter Component
 * 
 * Provides quick filters and custom date range selection for dashboard data.
 * Uses Headless UI Listbox for accessibility.
 */

type QuickFilter = "today" | "last-week" | "last-month" | "last-quarter" | "all-time";

interface QuickFilterOption {
  id: QuickFilter;
  label: string;
  getDateRange: () => DateRange;
}

const QUICK_FILTERS: QuickFilterOption[] = [
  {
    id: "today",
    label: "Today",
    getDateRange: () => ({
      start: startOfToday(),
      end: endOfToday(), // Include full day
    }),
  },
  {
    id: "last-week",
    label: "Last Week",
    getDateRange: () => ({
      start: subDays(startOfToday(), 7),
      end: endOfToday(), // Include full day
    }),
  },
  {
    id: "last-month",
    label: "Last Month",
    getDateRange: () => ({
      start: subMonths(startOfToday(), 1),
      end: endOfToday(), // Include full day
    }),
  },
  {
    id: "last-quarter",
    label: "Last Quarter",
    getDateRange: () => ({
      start: subQuarters(startOfToday(), 1),
      end: endOfToday(), // Include full day
    }),
  },
  {
    id: "all-time",
    label: "All Time",
    getDateRange: () => ({
      start: new Date(2020, 0, 1), // Arbitrary start date
      end: endOfToday(), // Include full day (23:59:59.999)
    }),
  },
];

/**
 * Get current quick filter based on date range
 */
function getCurrentQuickFilter(dateRange: DateRange): QuickFilter {
  const today = startOfToday();
  const endOfDay = endOfToday();
  const lastWeek = subDays(today, 7);
  const lastMonth = subMonths(today, 1);
  const lastQuarter = subQuarters(today, 1);

  // Check if date range matches a quick filter
  // Compare end date with endOfToday() since all filters now use endOfToday()
  if (
    dateRange.start.getTime() === today.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "today";
  }
  if (
    dateRange.start.getTime() === lastWeek.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-week";
  }
  if (
    dateRange.start.getTime() === lastMonth.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-month";
  }
  if (
    dateRange.start.getTime() === lastQuarter.getTime() &&
    dateRange.end.getTime() === endOfDay.getTime()
  ) {
    return "last-quarter";
  }

  return "all-time";
}

interface DateRangeFilterProps {
  tutorCount?: number;
}

export function DateRangeFilter({
  tutorCount,
}: DateRangeFilterProps) {
  const { dateRange, setDateRange, qualityView, setQualityView } = useDashboardStore();
  const currentFilter = getCurrentQuickFilter(dateRange);
  const selectedFilter = QUICK_FILTERS.find((f) => f.id === currentFilter);

  const handleFilterChange = (filterId: QuickFilter) => {
    const filter = QUICK_FILTERS.find((f) => f.id === filterId);
    if (filter) {
      setDateRange(filter.getDateRange());
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <label className="text-sm font-medium text-gray-700">
        Date Range:
      </label>
      <Listbox value={currentFilter} onChange={handleFilterChange}>
        <div className="relative">
          <Listbox.Button className="relative w-48 cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left text-sm shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm">
            <span className="block truncate">
              {selectedFilter?.label || "Select range"}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {QUICK_FILTERS.map((filter) => (
                <Listbox.Option
                  key={filter.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"
                    }`
                  }
                  value={filter.id}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {filter.label}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      
      {/* Tutor Counter */}
      {tutorCount !== undefined && (
        <span className="text-sm font-medium text-gray-600">
          {tutorCount} {tutorCount === 1 ? "tutor" : "tutors"}
        </span>
      )}
      
      {/* Sessions Toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-sm font-medium text-gray-700">
          Sessions:
        </label>
        <RadioGroup value={qualityView} onChange={setQualityView}>
          <div className="flex gap-2 rounded-md bg-gray-100 p-1">
            <RadioGroup.Option value="all">
              {({ checked }) => (
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    checked
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All
                </button>
              )}
            </RadioGroup.Option>
            <RadioGroup.Option value="first">
              {({ checked }) => (
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    checked
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  First
                </button>
              )}
            </RadioGroup.Option>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

