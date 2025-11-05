import {
  differenceInMinutes as dfnDifferenceInMinutes,
  differenceInHours as dfnDifferenceInHours,
  differenceInDays as dfnDifferenceInDays,
} from "date-fns";

/**
 * Time Utilities
 * 
 * Helper functions for calculating time differences and durations
 * used in rules engine and scoring calculations.
 * 
 * All functions handle Date objects or ISO string timestamps.
 */

/**
 * Calculate difference in minutes between two dates
 * 
 * @param date1 - Earlier date (or ISO string)
 * @param date2 - Later date (or ISO string)
 * @returns Difference in minutes (positive if date2 > date1)
 */
export function differenceInMinutes(
  date1: Date | string,
  date2: Date | string
): number {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return dfnDifferenceInMinutes(d2, d1);
}

/**
 * Calculate difference in hours between two dates
 * 
 * @param date1 - Earlier date (or ISO string)
 * @param date2 - Later date (or ISO string)
 * @returns Difference in hours (positive if date2 > date1)
 */
export function differenceInHours(
  date1: Date | string,
  date2: Date | string
): number {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return dfnDifferenceInHours(d2, d1);
}

/**
 * Calculate difference in days between two dates
 * 
 * @param date1 - Earlier date (or ISO string)
 * @param date2 - Later date (or ISO string)
 * @returns Difference in days (positive if date2 > date1)
 */
export function differenceInDays(
  date1: Date | string,
  date2: Date | string
): number {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return dfnDifferenceInDays(d2, d1);
}

/**
 * Calculate session duration in minutes
 * 
 * @param startTime - Session start time
 * @param endTime - Session end time
 * @returns Duration in minutes, or null if either time is missing
 */
export function calculateSessionDuration(
  startTime: Date | string | null | undefined,
  endTime: Date | string | null | undefined
): number | null {
  if (!startTime || !endTime) {
    return null;
  }
  return differenceInMinutes(startTime, endTime);
}

/**
 * Calculate lateness in minutes
 * 
 * @param scheduledTime - When session was scheduled to start
 * @param actualTime - When tutor/student actually joined (null if no-show)
 * @returns Minutes late (positive number), or null if no-show
 */
export function calculateLateness(
  scheduledTime: Date | string,
  actualTime: Date | string | null | undefined
): number | null {
  if (!actualTime) {
    return null; // No-show
  }
  const lateness = differenceInMinutes(scheduledTime, actualTime);
  return lateness > 0 ? lateness : 0; // Return 0 if on-time or early
}

/**
 * Check if a session is a no-show
 * 
 * @param scheduledTime - When session was scheduled to start
 * @param joinTime - When tutor/student actually joined
 * @returns True if joinTime is null or undefined
 */
export function isNoShow(
  joinTime: Date | string | null | undefined
): boolean {
  return !joinTime;
}

/**
 * Check if a session started late
 * 
 * @param scheduledTime - When session was scheduled to start
 * @param actualTime - When tutor/student actually joined
 * @param thresholdMinutes - Minutes threshold for considering "late" (default: 5)
 * @returns True if lateness exceeds threshold
 */
export function isLate(
  scheduledTime: Date | string,
  actualTime: Date | string | null | undefined,
  thresholdMinutes: number = 5
): boolean {
  const lateness = calculateLateness(scheduledTime, actualTime);
  return lateness !== null && lateness >= thresholdMinutes;
}

/**
 * Check if a session ended early
 * 
 * @param scheduledEndTime - When session was scheduled to end
 * @param actualEndTime - When tutor/student actually left
 * @param thresholdMinutes - Minutes threshold for considering "early" (default: 10)
 * @returns True if ended early by more than threshold
 */
export function endedEarly(
  scheduledEndTime: Date | string,
  actualEndTime: Date | string | null | undefined,
  thresholdMinutes: number = 10
): boolean {
  if (!actualEndTime) {
    return false; // Can't determine if ended early if no end time
  }
  const earlyMinutes = differenceInMinutes(actualEndTime, scheduledEndTime);
  return earlyMinutes >= thresholdMinutes;
}

/**
 * Get time window for score calculation
 * 
 * @param days - Number of days to look back
 * @returns Object with windowStart and windowEnd dates
 */
export function getTimeWindow(days: number): {
  windowStart: Date;
  windowEnd: Date;
} {
  const windowEnd = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  return {
    windowStart,
    windowEnd,
  };
}

