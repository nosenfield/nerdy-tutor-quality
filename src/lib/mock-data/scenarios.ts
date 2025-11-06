/**
 * Problem Tutor Scenarios
 * 
 * Defines specific test scenarios for problem tutors with known behavioral patterns.
 * These scenarios are used to generate realistic test data that matches expected
 * problem patterns for testing the rules engine.
 */

/**
 * Scenario IDs for problem tutors
 */
export const SCENARIO_IDS = {
  CHRONIC_NO_SHOW: "tutor_10000",
  ALWAYS_LATE: "tutor_10001",
  POOR_FIRST_SESSIONS: "tutor_10002",
  FREQUENT_RESCHEDULER: "tutor_10003",
  ENDS_EARLY: "tutor_10004",
  EXCELLENT: "tutor_10005",
} as const;

/**
 * Scenario-specific configurations
 */
export interface ScenarioConfig {
  noShowRate?: number;
  avgLatenessMinutes?: number;
  avgFirstSessionRating?: number;
  rescheduleRate?: number;
  avgEarlyEndMinutes?: number;
}

/**
 * Scenario configurations for each problem tutor
 */
export const SCENARIO_CONFIGS: Record<string, ScenarioConfig> = {
  [SCENARIO_IDS.CHRONIC_NO_SHOW]: {
    noShowRate: 0.16, // 16% no-show rate
  },
  [SCENARIO_IDS.ALWAYS_LATE]: {
    avgLatenessMinutes: 15, // Average 15 minutes late
  },
  [SCENARIO_IDS.POOR_FIRST_SESSIONS]: {
    avgFirstSessionRating: 2.1, // Average 2.1 rating for first sessions
  },
  [SCENARIO_IDS.FREQUENT_RESCHEDULER]: {
    rescheduleRate: 0.3, // 30% reschedule rate
  },
  [SCENARIO_IDS.ENDS_EARLY]: {
    avgEarlyEndMinutes: 20, // Average 20 minutes early
  },
};

/**
 * Get scenario configuration for a tutor ID
 */
export function getScenarioConfig(tutorId: string): ScenarioConfig | null {
  return SCENARIO_CONFIGS[tutorId] || null;
}

/**
 * Check if a tutor ID matches a specific scenario
 */
export function isScenarioTutor(tutorId: string, scenarioId: string): boolean {
  return tutorId === scenarioId;
}

/**
 * Check if a tutor ID is a chronic no-show tutor
 */
export function isChronicNoShowTutor(tutorId: string): boolean {
  return tutorId === SCENARIO_IDS.CHRONIC_NO_SHOW;
}

/**
 * Check if a tutor ID is an always late tutor
 */
export function isAlwaysLateTutor(tutorId: string): boolean {
  return tutorId === SCENARIO_IDS.ALWAYS_LATE;
}

/**
 * Check if a tutor ID is a poor first sessions tutor
 */
export function isPoorFirstSessionsTutor(tutorId: string): boolean {
  return tutorId === SCENARIO_IDS.POOR_FIRST_SESSIONS;
}

