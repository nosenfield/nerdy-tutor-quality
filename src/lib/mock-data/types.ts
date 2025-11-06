/**
 * Mock Data Types
 * 
 * Shared types for mock data generation system.
 */

/**
 * Tutor persona types representing different quality levels
 */
export type TutorPersonaType =
  | "excellent"
  | "good"
  | "average"
  | "struggling"
  | "problematic";

/**
 * Tutor persona configuration
 * Defines the behavioral patterns for a tutor persona type
 */
export interface TutorPersona {
  /** Persona type identifier */
  type: TutorPersonaType;
  
  /** Average student rating range */
  avgRatingRange: { min: number; max: number };
  
  /** Average first session rating range (typically lower) */
  avgFirstSessionRatingRange: { min: number; max: number };
  
  /** No-show rate (0.0 to 1.0) */
  noShowRate: number;
  
  /** Reschedule rate (0.0 to 1.0) */
  rescheduleRate: { min: number; max: number };
  
  /** Rate of tutor-initiated reschedules (0.0 to 1.0) */
  tutorInitiatedRescheduleRate: number;
  
  /** Lateness rate (0.0 to 1.0) */
  lateRate: { min: number; max: number };
  
  /** Average lateness in minutes when late */
  avgLatenessMinutes: { min: number; max: number };
  
  /** Early end rate (0.0 to 1.0) */
  earlyEndRate: { min: number; max: number };
  
  /** Average early end minutes when ending early */
  avgEarlyEndMinutes: { min: number; max: number };
  
  /** Description of this persona type */
  description: string;
}

/**
 * Distribution weights for tutor persona types
 * Values should sum to 1.0
 */
export interface TutorPersonaDistribution {
  excellent: number;
  good: number;
  average: number;
  struggling: number;
  problematic: number;
}

/**
 * Rating distribution weights
 * Values should sum to 1.0
 */
export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}
