import { faker } from "@faker-js/faker";
import { addMinutes, subMinutes } from "date-fns";
import type { SessionInsert } from "../types/session";
import type { TutorPersonaType } from "./types";
import {
  getPersona,
  ONGOING_RATING_DISTRIBUTION,
  FIRST_SESSION_RATING_DISTRIBUTION,
} from "./personas";

/**
 * Mock Data Generator
 * 
 * Generates realistic mock data for tutors, students, and sessions
 * based on persona types and industry benchmarks.
 */

/**
 * Generated tutor metadata
 */
export interface MockTutor {
  tutorId: string;
  personaType: TutorPersonaType;
  name: string;
  email: string;
}

/**
 * Generated student metadata
 */
export interface MockStudent {
  studentId: string;
  name: string;
  email: string;
}

/**
 * Generate a mock tutor with realistic ID and metadata
 */
export function generateMockTutor(
  personaType: TutorPersonaType,
  index?: number
): MockTutor {
  const tutorId = `tutor_${index !== undefined ? index.toString().padStart(4, "0") : faker.string.uuid()}`;

  return {
    tutorId,
    personaType,
    name: faker.person.fullName(),
    email: faker.internet.email({ firstName: tutorId }),
  };
}

/**
 * Generate a mock student with realistic ID and metadata
 */
export function generateMockStudent(index?: number): MockStudent {
  const studentId = `student_${index !== undefined ? index.toString().padStart(4, "0") : faker.string.uuid()}`;

  return {
    studentId,
    name: faker.person.fullName(),
    email: faker.internet.email({ firstName: studentId }),
  };
}

/**
 * Get rating based on distribution
 */
function getRatingFromDistribution(
  distribution: typeof ONGOING_RATING_DISTRIBUTION
): number {
  const rand = faker.number.float({ min: 0, max: 1 });
  let cumulative = 0;

  for (const [rating, weight] of Object.entries(distribution).reverse()) {
    cumulative += weight;
    if (rand <= cumulative) {
      return parseInt(rating);
    }
  }

  return 5; // fallback
}

/**
 * Generate a mock session based on tutor persona
 */
export function generateMockSession(
  tutor: MockTutor,
  student: MockStudent,
  options: {
    isFirstSession?: boolean;
    scheduledStartTime?: Date;
    sessionLengthMinutes?: number;
    noShowRate?: number; // Override persona no-show rate
  } = {}
): SessionInsert {
  const persona = getPersona(tutor.personaType);
  const isFirstSession = options.isFirstSession ?? faker.datatype.boolean({ probability: 0.15 });
  const sessionLengthMinutes = options.sessionLengthMinutes ?? faker.number.int({ min: 45, max: 60 });
  const scheduledStartTime = options.scheduledStartTime ?? faker.date.recent({ days: 30 });

  // Determine if this session should be rescheduled
  const rescheduleRate = faker.number.float({
    min: persona.rescheduleRate.min,
    max: persona.rescheduleRate.max,
  });
  const wasRescheduled = faker.datatype.boolean({ probability: rescheduleRate });
  const rescheduledBy = wasRescheduled
    ? faker.datatype.boolean({ probability: persona.tutorInitiatedRescheduleRate })
      ? "tutor"
      : "student"
    : null;

  // Determine if this is a no-show (use override if provided, otherwise use persona default)
  const noShowRate = options.noShowRate !== undefined ? options.noShowRate : persona.noShowRate;
  const isNoShow = faker.datatype.boolean({ probability: noShowRate });

  // Determine lateness
  const isLate = faker.datatype.boolean({
    probability: faker.number.float({
      min: persona.lateRate.min,
      max: persona.lateRate.max,
    }),
  });
  const latenessMinutes = isLate
    ? faker.number.int({
        min: persona.avgLatenessMinutes.min,
        max: persona.avgLatenessMinutes.max,
      })
    : faker.number.int({ min: -2, max: 2 }); // Small variance for punctuality

  // Determine early end
  const isEarlyEnd = faker.datatype.boolean({
    probability: faker.number.float({
      min: persona.earlyEndRate.min,
      max: persona.earlyEndRate.max,
    }),
  });
  const earlyEndMinutes = isEarlyEnd
    ? faker.number.int({
        min: persona.avgEarlyEndMinutes.min,
        max: persona.avgEarlyEndMinutes.max,
      })
    : 0;

  // Calculate actual times
  const scheduledEndTime = addMinutes(scheduledStartTime, sessionLengthMinutes);
  const tutorJoinTime = isNoShow
    ? null
    : addMinutes(scheduledStartTime, latenessMinutes);
  const studentJoinTime = tutorJoinTime
    ? addMinutes(tutorJoinTime, faker.number.int({ min: 0, max: 3 }))
    : null;
  const tutorLeaveTime = tutorJoinTime
    ? subMinutes(scheduledEndTime, earlyEndMinutes)
    : null;
  const studentLeaveTime = tutorLeaveTime
    ? addMinutes(tutorLeaveTime, faker.number.int({ min: 0, max: 2 }))
    : null;

  // Generate ratings based on persona and session type
  const ratingDistribution = isFirstSession
    ? FIRST_SESSION_RATING_DISTRIBUTION
    : ONGOING_RATING_DISTRIBUTION;

  // Adjust rating based on persona average rating
  const baseRating = getRatingFromDistribution(ratingDistribution);
  const personaAvgRating = faker.number.float({
    min: persona.avgRatingRange.min,
    max: persona.avgRatingRange.max,
  });

  // Modulate rating to match persona average
  let studentRating = baseRating;
  if (personaAvgRating < 4.0 && baseRating >= 4) {
    studentRating = faker.number.int({ min: 1, max: 3 });
  } else if (personaAvgRating < 3.5 && baseRating >= 3) {
    studentRating = faker.number.int({ min: 1, max: 2 });
  } else if (personaAvgRating >= 4.7 && baseRating <= 3) {
    studentRating = faker.number.int({ min: 4, max: 5 });
  }

  const tutorRating = faker.number.int({ min: 4, max: 5 }); // Tutors generally rate sessions highly

  // Generate feedback descriptions
  const studentFeedbackDescription =
    studentRating >= 4
      ? faker.lorem.sentence({ min: 5, max: 15 })
      : faker.lorem.sentence({ min: 3, max: 10 });
  const tutorFeedbackDescription = faker.lorem.sentence({ min: 5, max: 15 });

  // Generate subjects
  const subjects = faker.helpers.arrayElements(
    ["Math", "Science", "English", "History", "Computer Science"],
    { min: 1, max: 2 }
  );

  // Calculate session lengths
  const sessionLengthScheduled = sessionLengthMinutes;
  const sessionLengthActual = tutorJoinTime && tutorLeaveTime
    ? Math.round(
        (tutorLeaveTime.getTime() - tutorJoinTime.getTime()) / (1000 * 60)
      )
    : null;

  return {
    sessionId: `session_${faker.string.uuid()}`,
    tutorId: tutor.tutorId,
    studentId: student.studentId,
    sessionStartTime: scheduledStartTime,
    sessionEndTime: scheduledEndTime,
    tutorJoinTime: tutorJoinTime ?? undefined,
    studentJoinTime: studentJoinTime ?? undefined,
    tutorLeaveTime: tutorLeaveTime ?? undefined,
    studentLeaveTime: studentLeaveTime ?? undefined,
    subjectsCovered: subjects,
    isFirstSession,
    sessionType: faker.helpers.arrayElement([
      "one-on-one",
      "group",
      "trial",
      null,
    ]),
    sessionLengthScheduled,
    sessionLengthActual,
    wasRescheduled,
    rescheduledBy: rescheduledBy as "tutor" | "student" | "system" | null,
    rescheduleCount: wasRescheduled ? faker.number.int({ min: 1, max: 3 }) : 0,
    tutorFeedbackRating: tutorRating,
    tutorFeedbackDescription,
    studentFeedbackRating: studentRating,
    studentFeedbackDescription,
    studentBookedFollowup: faker.datatype.boolean({ probability: 0.6 }),
  };
}
