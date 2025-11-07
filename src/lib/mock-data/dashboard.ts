/**
 * Dashboard Mock Data Generator
 * 
 * Generates mock data for dashboard visualization and testing.
 * Uses existing mock data generators and creates dashboard-specific summaries.
 */

import { faker } from "@faker-js/faker";
import type { TutorSummary, TutorDetail, DateRange } from "@/lib/types/dashboard";

/**
 * Generate mock tutor summary for dashboard
 * 
 * @param tutorId - Unique tutor identifier
 * @param index - Index in the list (for distribution patterns)
 * @param totalTutors - Total number of tutors (for distribution calculations)
 * @param seed - Optional seed for reproducible data
 */
function generateMockTutorSummary(
  tutorId: string,
  index: number,
  totalTutors: number,
  seed?: number
): TutorSummary {
  // Use seed if provided for reproducibility
  if (seed !== undefined) {
    faker.seed(seed + index);
  }

  // Determine zone based on index (70% safe, 20% warning, 10% risk)
  const zoneThreshold = Math.floor(totalTutors * 0.7);
  const warningThreshold = Math.floor(totalTutors * 0.9);

  let attendancePercentage: number;
  let keptSessionsPercentage: number;
  let avgRating: number;
  let firstSessionAvgRating: number | undefined;
  let firstSessionAttendancePercentage: number | undefined;
  let firstSessionKeptSessionsPercentage: number | undefined;
  let riskFlags: string[] = [];

  if (index < zoneThreshold) {
    // Safe zone (>90% attendance)
    attendancePercentage = faker.number.float({ min: 90, max: 100, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 85, max: 100, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 });
    // First sessions typically have slightly lower attendance/kept rates
    firstSessionAttendancePercentage = faker.number.float({ min: 85, max: 98, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 80, max: 95, fractionDigits: 1 });
  } else if (index < warningThreshold) {
    // Warning zone (70-90% attendance)
    attendancePercentage = faker.number.float({ min: 70, max: 90, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 60, max: 85, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 3.0, max: 4.5, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 2.5, max: 4.0, fractionDigits: 1 });
    // First sessions may have more issues
    firstSessionAttendancePercentage = faker.number.float({ min: 60, max: 85, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 50, max: 80, fractionDigits: 1 });
    riskFlags = ["low-attendance"];
  } else {
    // Risk zone (<70% attendance)
    attendancePercentage = faker.number.float({ min: 30, max: 70, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 40, max: 70, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 2.0, max: 3.5, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 1.5, max: 3.0, fractionDigits: 1 });
    // First sessions often have worse metrics
    firstSessionAttendancePercentage = faker.number.float({ min: 20, max: 65, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 30, max: 65, fractionDigits: 1 });
    riskFlags = ["low-attendance", "low-rating"];
  }

  // Generate session count with edge cases
  let totalSessions: number;
  if (index % 10 === 0) {
    // New tutors (5-10 sessions)
    totalSessions = faker.number.int({ min: 5, max: 10 });
  } else if (index % 10 === 1) {
    // Veteran tutors (100+ sessions)
    totalSessions = faker.number.int({ min: 100, max: 200 });
  } else {
    // Regular tutors (10-100 sessions)
    totalSessions = faker.number.int({ min: 10, max: 100 });
  }

  // Days on platform (roughly correlated with session count)
  const daysOnPlatform = Math.max(
    1,
    Math.floor(totalSessions * faker.number.float({ min: 0.5, max: 2.0 }))
  );

  // Only include firstSessionAvgRating if different from avgRating
  if (Math.abs(firstSessionAvgRating - avgRating) < 0.3) {
    firstSessionAvgRating = undefined;
  }

  return {
    tutorId,
    totalSessions,
    attendancePercentage,
    keptSessionsPercentage,
    avgRating,
    firstSessionAvgRating,
    firstSessionAttendancePercentage,
    firstSessionKeptSessionsPercentage,
    daysOnPlatform,
    riskFlags,
  };
}

/**
 * Generate mock tutor summaries for dashboard
 * 
 * @param count Number of tutors to generate (default: 10)
 * @param seed Optional seed for reproducible data
 * @returns Array of TutorSummary objects
 */
export function generateMockTutorSummaries(
  count: number = 10,
  seed?: number
): TutorSummary[] {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  const tutors: TutorSummary[] = [];
  
  for (let i = 0; i < count; i++) {
    const tutorId = `tutor_${i.toString().padStart(4, "0")}`;
    
    // Generate specific tutors based on requirements
    if (i === 0) {
      // Tutor 0: 100% attendance, 100% sessions kept, 5/5 rating, 8 sessions
      tutors.push({
        tutorId,
        totalSessions: 8,
        attendancePercentage: 100,
        keptSessionsPercentage: 100,
        avgRating: 5.0,
        firstSessionAvgRating: 5.0,
        firstSessionAttendancePercentage: 100,
        firstSessionKeptSessionsPercentage: 100,
        daysOnPlatform: Math.max(1, Math.floor(8 * 1.5)),
        riskFlags: [],
      });
    } else if (i === 1) {
      // Tutor 1: 100% attendance, 100% sessions kept, 5/5 rating, 1 session
      tutors.push({
        tutorId,
        totalSessions: 1,
        attendancePercentage: 100,
        keptSessionsPercentage: 100,
        avgRating: 5.0,
        firstSessionAvgRating: 5.0,
        firstSessionAttendancePercentage: 100,
        firstSessionKeptSessionsPercentage: 100,
        daysOnPlatform: 1,
        riskFlags: [],
      });
    } else if (i === 2) {
      // Tutor 2: 10 total sessions (normal profile)
      tutors.push({
        tutorId,
        totalSessions: 10,
        attendancePercentage: faker.number.float({ min: 80, max: 95, fractionDigits: 1 }),
        keptSessionsPercentage: faker.number.float({ min: 75, max: 90, fractionDigits: 1 }),
        avgRating: faker.number.float({ min: 3.5, max: 4.5, fractionDigits: 1 }),
        firstSessionAvgRating: faker.number.float({ min: 3.0, max: 4.5, fractionDigits: 1 }),
        firstSessionAttendancePercentage: faker.number.float({ min: 75, max: 90, fractionDigits: 1 }),
        firstSessionKeptSessionsPercentage: faker.number.float({ min: 70, max: 85, fractionDigits: 1 }),
        daysOnPlatform: Math.max(1, Math.floor(10 * faker.number.float({ min: 0.5, max: 2.0 }))),
        riskFlags: [],
      });
    } else if (i === 3) {
      // Tutor 3: 0% attendance, 0% sessions kept, 1/5 rating, multiple sessions (5)
      tutors.push({
        tutorId,
        totalSessions: 5,
        attendancePercentage: 0,
        keptSessionsPercentage: 0,
        avgRating: 1.0,
        firstSessionAvgRating: 1.0,
        firstSessionAttendancePercentage: 0,
        firstSessionKeptSessionsPercentage: 0,
        daysOnPlatform: Math.max(1, Math.floor(5 * 1.0)),
        riskFlags: ["low-attendance", "low-rating"],
      });
    } else if (i === 4) {
      // Tutor 4: 0% attendance, 0% sessions kept, 1/5 rating, 1 session
      tutors.push({
        tutorId,
        totalSessions: 1,
        attendancePercentage: 0,
        keptSessionsPercentage: 0,
        avgRating: 1.0,
        firstSessionAvgRating: 1.0,
        firstSessionAttendancePercentage: 0,
        firstSessionKeptSessionsPercentage: 0,
        daysOnPlatform: 1,
        riskFlags: ["low-attendance", "low-rating"],
      });
    } else {
      // Tutors 5-9: Fill with varied profiles (max 10 sessions each)
      const totalSessions = faker.number.int({ min: 1, max: 10 });
      const zone = i < 7 ? "safe" : i < 9 ? "warning" : "risk";
      
      let attendancePercentage: number;
      let keptSessionsPercentage: number;
      let avgRating: number;
      let firstSessionAvgRating: number | undefined;
      let firstSessionAttendancePercentage: number | undefined;
      let firstSessionKeptSessionsPercentage: number | undefined;
      let riskFlags: string[] = [];
      
      if (zone === "safe") {
        attendancePercentage = faker.number.float({ min: 85, max: 100, fractionDigits: 1 });
        keptSessionsPercentage = faker.number.float({ min: 80, max: 100, fractionDigits: 1 });
        avgRating = faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 });
        firstSessionAvgRating = faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 });
        firstSessionAttendancePercentage = faker.number.float({ min: 80, max: 100, fractionDigits: 1 });
        firstSessionKeptSessionsPercentage = faker.number.float({ min: 75, max: 100, fractionDigits: 1 });
      } else if (zone === "warning") {
        attendancePercentage = faker.number.float({ min: 60, max: 85, fractionDigits: 1 });
        keptSessionsPercentage = faker.number.float({ min: 55, max: 80, fractionDigits: 1 });
        avgRating = faker.number.float({ min: 2.5, max: 4.0, fractionDigits: 1 });
        firstSessionAvgRating = faker.number.float({ min: 2.0, max: 3.5, fractionDigits: 1 });
        firstSessionAttendancePercentage = faker.number.float({ min: 55, max: 80, fractionDigits: 1 });
        firstSessionKeptSessionsPercentage = faker.number.float({ min: 50, max: 75, fractionDigits: 1 });
        riskFlags = ["low-attendance"];
      } else {
        attendancePercentage = faker.number.float({ min: 20, max: 60, fractionDigits: 1 });
        keptSessionsPercentage = faker.number.float({ min: 25, max: 60, fractionDigits: 1 });
        avgRating = faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 1 });
        firstSessionAvgRating = faker.number.float({ min: 1.0, max: 2.0, fractionDigits: 1 });
        firstSessionAttendancePercentage = faker.number.float({ min: 15, max: 55, fractionDigits: 1 });
        firstSessionKeptSessionsPercentage = faker.number.float({ min: 20, max: 55, fractionDigits: 1 });
        riskFlags = ["low-attendance", "low-rating"];
      }
      
      tutors.push({
        tutorId,
        totalSessions,
        attendancePercentage,
        keptSessionsPercentage,
        avgRating,
        firstSessionAvgRating: totalSessions > 1 ? firstSessionAvgRating : undefined,
        firstSessionAttendancePercentage: totalSessions > 1 ? firstSessionAttendancePercentage : undefined,
        firstSessionKeptSessionsPercentage: totalSessions > 1 ? firstSessionKeptSessionsPercentage : undefined,
        daysOnPlatform: Math.max(1, Math.floor(totalSessions * faker.number.float({ min: 0.5, max: 2.0 }))),
        riskFlags,
      });
    }
  }

  return tutors;
}

/**
 * Generate alternate mock tutor summary with different distribution
 * This creates visually distinct data for testing mock vs live switching
 */
function generateAlternateMockTutorSummary(
  tutorId: string,
  index: number,
  totalTutors: number,
  seed?: number
): TutorSummary {
  // Use seed if provided for reproducibility
  if (seed !== undefined) {
    faker.seed(seed + index + 10000); // Offset seed to ensure different data
  }

  // Different distribution: 50% safe, 30% warning, 20% risk (more risk than default)
  const zoneThreshold = Math.floor(totalTutors * 0.5);
  const warningThreshold = Math.floor(totalTutors * 0.8);

  let attendancePercentage: number;
  let keptSessionsPercentage: number;
  let avgRating: number;
  let firstSessionAvgRating: number | undefined;
  let firstSessionAttendancePercentage: number | undefined;
  let firstSessionKeptSessionsPercentage: number | undefined;
  let riskFlags: string[] = [];

  if (index < zoneThreshold) {
    // Safe zone - slightly lower range than default
    attendancePercentage = faker.number.float({ min: 85, max: 98, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 80, max: 95, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 3.8, max: 4.8, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 3.2, max: 4.8, fractionDigits: 1 });
    firstSessionAttendancePercentage = faker.number.float({ min: 80, max: 95, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 75, max: 90, fractionDigits: 1 });
  } else if (index < warningThreshold) {
    // Warning zone - wider range
    attendancePercentage = faker.number.float({ min: 65, max: 85, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 55, max: 80, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 2.8, max: 4.2, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 2.2, max: 3.8, fractionDigits: 1 });
    firstSessionAttendancePercentage = faker.number.float({ min: 55, max: 80, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 45, max: 75, fractionDigits: 1 });
    riskFlags = ["low-attendance"];
  } else {
    // Risk zone - more extreme values
    attendancePercentage = faker.number.float({ min: 20, max: 65, fractionDigits: 1 });
    keptSessionsPercentage = faker.number.float({ min: 30, max: 65, fractionDigits: 1 });
    avgRating = faker.number.float({ min: 1.5, max: 3.2, fractionDigits: 1 });
    firstSessionAvgRating = faker.number.float({ min: 1.0, max: 2.8, fractionDigits: 1 });
    firstSessionAttendancePercentage = faker.number.float({ min: 15, max: 60, fractionDigits: 1 });
    firstSessionKeptSessionsPercentage = faker.number.float({ min: 25, max: 60, fractionDigits: 1 });
    riskFlags = ["low-attendance", "low-rating"];
  }

  // Different session count distribution - more new tutors, fewer veterans
  let totalSessions: number;
  if (index % 7 === 0) {
    // More new tutors (5-15 sessions)
    totalSessions = faker.number.int({ min: 5, max: 15 });
  } else if (index % 15 === 0) {
    // Fewer veteran tutors (80-150 sessions)
    totalSessions = faker.number.int({ min: 80, max: 150 });
  } else {
    // Regular tutors (15-80 sessions) - narrower range
    totalSessions = faker.number.int({ min: 15, max: 80 });
  }

  // Days on platform - different correlation
  const daysOnPlatform = Math.max(
    1,
    Math.floor(totalSessions * faker.number.float({ min: 0.8, max: 1.5 }))
  );

  return {
    tutorId,
    totalSessions,
    attendancePercentage,
    keptSessionsPercentage,
    avgRating,
    firstSessionAvgRating: totalSessions > 5 ? firstSessionAvgRating : undefined,
    firstSessionAttendancePercentage: totalSessions > 5 ? firstSessionAttendancePercentage : undefined,
    firstSessionKeptSessionsPercentage: totalSessions > 5 ? firstSessionKeptSessionsPercentage : undefined,
    daysOnPlatform,
    riskFlags,
  };
}

/**
 * Generate alternate mock tutor summaries with different distribution
 * This creates visually distinct data for testing mock vs live switching
 * 
 * @param count Number of tutors to generate (default: 150)
 * @param seed Optional seed for reproducible data
 * @returns Array of TutorSummary objects with different distribution
 */
export function generateAlternateMockTutorSummaries(
  count: number = 150,
  seed?: number
): TutorSummary[] {
  if (seed !== undefined) {
    faker.seed(seed + 9999); // Different seed offset
  }
  const tutors: TutorSummary[] = [];
  for (let i = 0; i < count; i++) {
    const tutorId = `mock_${i.toString().padStart(4, "0")}`; // Different ID prefix
    tutors.push(generateAlternateMockTutorSummary(tutorId, i, count, seed));
  }
  return tutors;
}

/**
 * Generate mock tutor detail from summary
 */
export function generateMockTutorDetail(
  summary: TutorSummary
): TutorDetail {
  const riskFlags = summary.riskFlags.map((flag) => {
    let severity: "critical" | "high" | "medium" | "low" = "low";
    let message = "";

    if (flag === "low-attendance") {
      severity = summary.attendancePercentage < 50 ? "critical" : "high";
      message = `Attendance rate is ${summary.attendancePercentage.toFixed(1)}%`;
    } else if (flag === "low-rating") {
      severity = summary.avgRating < 2.5 ? "critical" : "medium";
      message = `Average rating is ${summary.avgRating.toFixed(1)}/5.0`;
    }

    return {
      type: flag,
      severity,
      message,
    };
  });

  return {
    ...summary,
    riskFlags,
  };
}

/**
 * Filter tutors by date range (mock implementation)
 */
export function filterTutorsByDateRange(
  tutors: TutorSummary[],
  dateRange: DateRange
): TutorSummary[] {
  // Mock implementation - in real app, this would filter by session dates
  // For now, return all tutors
  return tutors;
}

/**
 * Get flagged tutors (mock implementation)
 */
export function getFlaggedTutors(
  tutors: TutorSummary[]
): TutorSummary[] {
  return tutors.filter((tutor) => tutor.riskFlags.length > 0);
}

