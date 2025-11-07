"use client";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";

/**
 * Tutor Assessment Dashboard
 * 
 * Main dashboard page displaying scatter plots and tutor data.
 * This is the primary view after login.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Tutor Assessment Dashboard
          </h1>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <DateRangeFilter />
          </div>

          {/* Plots Grid - Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Placeholder for Attendance Plot */}
            <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
              <p className="text-gray-500 text-sm">Attendance Plot (CC-2)</p>
            </div>

            {/* Placeholder for Reschedules Plot */}
            <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
              <p className="text-gray-500 text-sm">Reschedules Plot (CC-2)</p>
            </div>

            {/* Placeholder for Quality Plot */}
            <div className="bg-white rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center md:col-span-2 lg:col-span-1">
              <p className="text-gray-500 text-sm">Quality Plot (CC-2)</p>
            </div>
          </div>

          {/* Table Section - Placeholder */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-500 text-sm text-center">
              Flagged Tutors Table (CC-7)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

