import type {
  TutorPersona,
  TutorPersonaType,
  TutorPersonaDistribution,
  RatingDistribution,
} from "./types";

/**
 * Tutor Persona Configurations
 * 
 * Defines realistic behavioral patterns for different tutor quality levels.
 * Based on industry benchmarks and research.
 * 
 * Used for generating realistic mock data that matches real-world distributions.
 */

// Re-export types for convenience
export type { TutorPersonaType, TutorPersona };

/**
 * Tutor Persona Configurations
 * 
 * Defines realistic behavioral patterns for different tutor quality levels.
 * Based on industry benchmarks and research.
 * 
 * Used for generating realistic mock data that matches real-world distributions.
 */

/**
 * Realistic tutor persona type distribution
 * Based on 80/20 rule: 20% excellent, 50% good, 20% average, 8% struggling, 2% problematic
 */
export const TUTOR_PERSONA_DISTRIBUTION: TutorPersonaDistribution = {
  excellent: 0.2, // 20% are excellent
  good: 0.5, // 50% are good
  average: 0.2, // 20% are average
  struggling: 0.08, // 8% are struggling
  problematic: 0.02, // 2% have serious issues
};

/**
 * Rating distribution for ongoing sessions (left-skewed)
 * Most sessions get high ratings
 */
export const ONGOING_RATING_DISTRIBUTION: RatingDistribution = {
  5: 0.45, // 45% five-star
  4: 0.35, // 35% four-star
  3: 0.12, // 12% three-star
  2: 0.05, // 5% two-star
  1: 0.03, // 3% one-star
};

/**
 * Rating distribution for first sessions
 * First sessions have lower ratings due to adjustment period
 */
export const FIRST_SESSION_RATING_DISTRIBUTION: RatingDistribution = {
  5: 0.3, // 30% five-star (lower than ongoing)
  4: 0.35, // 35% four-star
  3: 0.2, // 20% three-star (higher than ongoing)
  2: 0.1, // 10% two-star
  1: 0.05, // 5% one-star
};

/**
 * Persona configurations for each tutor type
 */
export const TUTOR_PERSONAS: Record<TutorPersonaType, TutorPersona> = {
  excellent: {
    type: "excellent",
    avgRatingRange: { min: 4.7, max: 5.0 },
    avgFirstSessionRatingRange: { min: 4.5, max: 4.9 },
    noShowRate: 0.0, // No-show rate
    rescheduleRate: { min: 0.0, max: 0.03 }, // Very low reschedule rate
    tutorInitiatedRescheduleRate: 0.982, // Industry standard
    lateRate: { min: 0.0, max: 0.05 }, // Rarely late
    avgLatenessMinutes: { min: 1, max: 3 }, // When late, very minimal
    earlyEndRate: { min: 0.0, max: 0.02 }, // Almost never end early
    avgEarlyEndMinutes: { min: 2, max: 5 }, // When ending early, minimal
    description:
      "Top performers with excellent ratings, perfect attendance, and minimal issues",
  },

  good: {
    type: "good",
    avgRatingRange: { min: 4.3, max: 4.7 },
    avgFirstSessionRatingRange: { min: 4.0, max: 4.5 },
    noShowRate: 0.0, // No-show rate
    rescheduleRate: { min: 0.02, max: 0.08 }, // Low reschedule rate
    tutorInitiatedRescheduleRate: 0.982,
    lateRate: { min: 0.0, max: 0.1 }, // Occasionally late
    avgLatenessMinutes: { min: 2, max: 7 }, // Moderate lateness when late
    earlyEndRate: { min: 0.0, max: 0.05 }, // Rarely end early
    avgEarlyEndMinutes: { min: 3, max: 8 },
    description:
      "Solid performers with good ratings and minor occasional issues",
  },

  average: {
    type: "average",
    avgRatingRange: { min: 3.8, max: 4.3 },
    avgFirstSessionRatingRange: { min: 3.5, max: 4.0 },
    noShowRate: 0.01, // Occasional no-shows
    rescheduleRate: { min: 0.08, max: 0.15 }, // Moderate reschedule rate
    tutorInitiatedRescheduleRate: 0.982,
    lateRate: { min: 0.05, max: 0.15 }, // Some lateness patterns
    avgLatenessMinutes: { min: 5, max: 12 }, // Moderate lateness
    earlyEndRate: { min: 0.02, max: 0.08 }, // Some early ends
    avgEarlyEndMinutes: { min: 5, max: 12 },
    description:
      "Average performers with some room for improvement",
  },

  struggling: {
    type: "struggling",
    avgRatingRange: { min: 3.2, max: 3.8 },
    avgFirstSessionRatingRange: { min: 2.8, max: 3.4 },
    noShowRate: 0.03, // Higher no-show rate
    rescheduleRate: { min: 0.15, max: 0.25 }, // High reschedule rate
    tutorInitiatedRescheduleRate: 0.982,
    lateRate: { min: 0.15, max: 0.25 }, // Frequent lateness
    avgLatenessMinutes: { min: 8, max: 18 }, // Significant lateness
    earlyEndRate: { min: 0.08, max: 0.15 }, // Frequent early ends
    avgEarlyEndMinutes: { min: 10, max: 20 },
    description:
      "Tutors with consistent issues requiring coaching intervention",
  },

  problematic: {
    type: "problematic",
    avgRatingRange: { min: 2.0, max: 3.2 },
    avgFirstSessionRatingRange: { min: 1.8, max: 2.5 },
    noShowRate: 0.08, // High no-show rate (up to 20% for chronic cases)
    rescheduleRate: { min: 0.25, max: 0.4 }, // Very high reschedule rate
    tutorInitiatedRescheduleRate: 0.982,
    lateRate: { min: 0.3, max: 0.5 }, // Chronic lateness
    avgLatenessMinutes: { min: 12, max: 25 }, // Severe lateness
    earlyEndRate: { min: 0.2, max: 0.35 }, // Frequent early ends
    avgEarlyEndMinutes: { min: 15, max: 30 },
    description:
      "Tutors with serious performance issues requiring immediate intervention",
  },
};

/**
 * Get persona configuration by type
 */
export function getPersona(type: TutorPersonaType): TutorPersona {
  return TUTOR_PERSONAS[type];
}

/**
 * Get all persona types
 */
export function getAllPersonaTypes(): TutorPersonaType[] {
  return Object.keys(TUTOR_PERSONAS) as TutorPersonaType[];
}

/**
 * Validate that distributions sum to 1.0
 */
export function validateDistributions(): boolean {
  const personaSum =
    TUTOR_PERSONA_DISTRIBUTION.excellent +
    TUTOR_PERSONA_DISTRIBUTION.good +
    TUTOR_PERSONA_DISTRIBUTION.average +
    TUTOR_PERSONA_DISTRIBUTION.struggling +
    TUTOR_PERSONA_DISTRIBUTION.problematic;

  const ongoingSum =
    ONGOING_RATING_DISTRIBUTION[5] +
    ONGOING_RATING_DISTRIBUTION[4] +
    ONGOING_RATING_DISTRIBUTION[3] +
    ONGOING_RATING_DISTRIBUTION[2] +
    ONGOING_RATING_DISTRIBUTION[1];

  const firstSum =
    FIRST_SESSION_RATING_DISTRIBUTION[5] +
    FIRST_SESSION_RATING_DISTRIBUTION[4] +
    FIRST_SESSION_RATING_DISTRIBUTION[3] +
    FIRST_SESSION_RATING_DISTRIBUTION[2] +
    FIRST_SESSION_RATING_DISTRIBUTION[1];

  return (
    Math.abs(personaSum - 1.0) < 0.001 &&
    Math.abs(ongoingSum - 1.0) < 0.001 &&
    Math.abs(firstSum - 1.0) < 0.001
  );
}
