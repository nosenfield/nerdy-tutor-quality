/**
 * Dashboard TypeScript Interfaces
 * 
 * Core type definitions for the Tutor Assessment Dashboard.
 * These interfaces define the data structures used throughout the dashboard.
 */

/**
 * Date range for filtering dashboard data
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Summary data for a tutor displayed in the dashboard table
 */
export interface TutorSummary {
  tutorId: string;
  totalSessions: number;
  attendancePercentage: number;
  keptSessionsPercentage: number;
  avgRating?: number; // Optional - undefined when no ratings exist (ratings are 1-5, so 0 is invalid)
  firstSessionAvgRating?: number;
  firstSessionAttendancePercentage?: number;
  firstSessionKeptSessionsPercentage?: number;
  daysOnPlatform: number;
  riskFlags: string[];
}

/**
 * Data point for scatter plot visualization
 */
export interface ScatterPlotDataPoint {
  x: number; // Session count
  y: number; // Percentage metric
  tutorId: string;
}

/**
 * Detailed tutor information displayed in the detail card
 */
export interface TutorDetail {
  tutorId: string;
  totalSessions: number;
  daysOnPlatform: number;
  avgRating?: number; // Optional - undefined when no ratings exist (ratings are 1-5, so 0 is invalid)
  firstSessionAvgRating?: number;
  attendancePercentage: number;
  keptSessionsPercentage: number;
  riskFlags: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
  }>;
}

