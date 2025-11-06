import { faker } from "@faker-js/faker";
import { subDays, addDays } from "date-fns";
import { db } from "../lib/db";
import { sessions } from "../lib/db/schema";
import {
  generateMockTutor,
  generateMockStudent,
  generateMockSession,
  type MockTutor,
  type MockStudent,
} from "../lib/mock-data/generators";
import {
  getAllPersonaTypes,
  TUTOR_PERSONA_DISTRIBUTION,
  type TutorPersonaType,
} from "../lib/mock-data/personas";
import { validateMockData, printValidationReport } from "../lib/mock-data/validation";

/**
 * Seed Script for Mock Data
 * 
 * Generates realistic mock data for development and testing:
 * - 100 tutors distributed across persona types
 * - 3,000 sessions over the past 30 days
 * - Problem tutor scenarios for testing
 * 
 * Usage: tsx src/scripts/seed-mock-data.ts
 */

interface SeedOptions {
  tutorCount?: number;
  sessionsPerTutor?: number;
  daysBack?: number;
  includeProblemTutors?: boolean;
}

/**
 * Generate tutors distributed by persona type
 */
function generateTutors(count: number): MockTutor[] {
  const tutors: MockTutor[] = [];
  const typeCounts: Record<TutorPersonaType, number> = {
    excellent: Math.round(count * TUTOR_PERSONA_DISTRIBUTION.excellent),
    good: Math.round(count * TUTOR_PERSONA_DISTRIBUTION.good),
    average: Math.round(count * TUTOR_PERSONA_DISTRIBUTION.average),
    struggling: Math.round(count * TUTOR_PERSONA_DISTRIBUTION.struggling),
    problematic: Math.round(count * TUTOR_PERSONA_DISTRIBUTION.problematic),
  };

  let index = 0;
  for (const personaType of getAllPersonaTypes()) {
    for (let i = 0; i < typeCounts[personaType]; i++) {
      tutors.push(generateMockTutor(personaType, index++));
    }
  }

  // Fill remaining slots with good tutors
  while (tutors.length < count) {
    tutors.push(generateMockTutor("good", index++));
  }

  return tutors.slice(0, count);
}

/**
 * Generate problem tutor scenarios for testing
 */
function generateProblemTutors(): MockTutor[] {
  return [
    // Chronic no-show tutor (16% no-show rate)
    { ...generateMockTutor("problematic", 10000), personaType: "problematic" },
    // Always late tutor (avg 15 min late)
    { ...generateMockTutor("problematic", 10001), personaType: "problematic" },
    // Poor first sessions tutor (2.1 avg first session rating)
    { ...generateMockTutor("struggling", 10002), personaType: "struggling" },
    // Frequent rescheduler tutor (30% reschedule rate)
    { ...generateMockTutor("problematic", 10003), personaType: "problematic" },
    // Ends sessions early tutor (avg 20 min early)
    { ...generateMockTutor("struggling", 10004), personaType: "struggling" },
  ];
}

/**
 * Generate sessions for a tutor over a time period
 */
function generateSessionsForTutor(
  tutor: MockTutor,
  studentPool: MockStudent[],
  sessionsCount: number,
  daysBack: number
) {
  const sessionList: (typeof sessions.$inferInsert)[] = [];
  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);

  // Track first sessions per student
  const studentFirstSessions = new Set<string>();

  for (let i = 0; i < sessionsCount; i++) {
    // Distribute sessions over the time period
    const randomDaysAgo = faker.number.int({ min: 0, max: daysBack });
    const sessionDate = subDays(endDate, randomDaysAgo);
    const sessionTime = faker.date.between({
      from: sessionDate,
      to: addDays(sessionDate, 1),
    });

    // Pick a student (reuse students for ongoing sessions)
    const student = faker.helpers.arrayElement(studentPool);
    const isFirstSession =
      !studentFirstSessions.has(student.studentId) &&
      faker.datatype.boolean({ probability: 0.3 });

    if (isFirstSession) {
      studentFirstSessions.add(student.studentId);
    }

    // Special handling for problem tutor scenarios
    let sessionOptions: Parameters<typeof generateMockSession>[2] = {
      isFirstSession,
      scheduledStartTime: sessionTime,
    };

    // Apply problem tutor patterns
    if (tutor.tutorId === "tutor_10000") {
      // Chronic no-show: 16% no-show rate
      sessionOptions = {
        ...sessionOptions,
        // Force no-show pattern
      };
    } else if (tutor.tutorId === "tutor_10001") {
      // Always late: avg 15 min late (handled by persona)
    } else if (tutor.tutorId === "tutor_10002") {
      // Poor first sessions: handled by persona
    } else if (tutor.tutorId === "tutor_10003") {
      // Frequent rescheduler: handled by persona
    } else if (tutor.tutorId === "tutor_10004") {
      // Ends early: handled by persona
    }

    sessionList.push(generateMockSession(tutor, student, sessionOptions));
  }

  return sessionList;
}

/**
 * Main seed function
 */
export async function seedMockData(options: SeedOptions = {}) {
  const {
    tutorCount = 100,
    sessionsPerTutor = 30,
    daysBack = 30,
    includeProblemTutors = true,
  } = options;

  console.log("🌱 Starting mock data generation...");
  console.log(`   Tutors: ${tutorCount}`);
  console.log(`   Sessions per tutor: ${sessionsPerTutor}`);
  console.log(`   Total sessions: ${tutorCount * sessionsPerTutor}`);
  console.log(`   Time period: ${daysBack} days`);

  // Generate tutors
  console.log("\n📚 Generating tutors...");
  const regularTutors = generateTutors(tutorCount);
  const problemTutors = includeProblemTutors ? generateProblemTutors() : [];
  const allTutors = [...regularTutors, ...problemTutors];

  console.log(`   Generated ${allTutors.length} tutors:`);
  const personaCounts = allTutors.reduce((acc, tutor) => {
    acc[tutor.personaType] = (acc[tutor.personaType] || 0) + 1;
    return acc;
  }, {} as Record<TutorPersonaType, number>);
  Object.entries(personaCounts).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });

  // Generate student pool
  console.log("\n👥 Generating students...");
  const studentPool: MockStudent[] = [];
  for (let i = 0; i < Math.max(100, tutorCount); i++) {
    studentPool.push(generateMockStudent(i));
  }
  console.log(`   Generated ${studentPool.length} students`);

  // Generate sessions
  console.log("\n📅 Generating sessions...");
  const allSessions: (typeof sessions.$inferInsert)[] = [];

  for (const tutor of allTutors) {
    const tutorSessions = generateSessionsForTutor(
      tutor,
      studentPool,
      sessionsPerTutor,
      daysBack
    );
    allSessions.push(...tutorSessions);
  }

  console.log(`   Generated ${allSessions.length} sessions`);

  // Insert into database
  console.log("\n💾 Inserting into database...");
  try {
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < allSessions.length; i += batchSize) {
      const batch = allSessions.slice(i, i + batchSize);
      await db.insert(sessions).values(batch);
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allSessions.length / batchSize)}`);
    }

    console.log("\n✅ Mock data seeded successfully!");
    console.log(`   Total sessions inserted: ${allSessions.length}`);

    // Validate mock data
    console.log("\n🔍 Validating mock data distributions...");
    const validation = await validateMockData(daysBack);
    printValidationReport(validation);

    if (!validation.valid) {
      console.warn("\n⚠️  Warning: Some distributions are outside expected ranges");
      console.warn("   This may be normal for smaller datasets or specific persona distributions");
    }
  } catch (error) {
    console.error("\n❌ Error seeding data:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedMockData()
    .then(() => {
      console.log("\n🎉 Seed complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
