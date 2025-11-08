// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

import { faker } from "@faker-js/faker";
import { subDays } from "date-fns";
import {
  generateMockTutor,
  generateMockStudent,
  generateMockSession,
  type MockTutor,
  type MockStudent,
} from "../lib/mock-data/generators";
import { resetDatabase } from "./reset-db";
import { db, sessions } from "../lib/db";

/**
 * Seed Personas Script
 * 
 * Generates specific tutor personas with exact metrics:
 * - 1 Perfect Repeat Tutor (>1 sessions, 100% attendance, 100% kept, 5.0 rating)
 * - 1 Perfect New Tutor (1 session, 100% attendance, 100% kept, 5.0 rating)
 * - 1 Terrible Repeat Tutor (>1 sessions, 0% attendance, 0% kept, 1.0 rating)
 * - 1 Terrible New Tutor (1 session, 0% attendance, 0% kept, 1.0 rating)
 * - 1 Mixed Most Veteran Tutor (10 sessions, mixed metrics)
 * - 5 Mixed Tutors (2-9 sessions each, mixed metrics)
 * 
 * Usage: tsx src/scripts/seed-personas.ts
 */

interface PersonaConfig {
  tutorId: string;
  sessionCount: number;
  attendancePercentage: number; // 0-100
  keptPercentage: number; // 0-100 (sessions not rescheduled)
  rating: number; // 1-5
  isNewTutor?: boolean; // If true, only 1 session
}

/**
 * Generate sessions for a specific persona
 */
function generatePersonaSessions(
  tutor: MockTutor,
  studentPool: MockStudent[],
  config: PersonaConfig,
  daysBack: number = 30
): typeof sessions.$inferInsert[] {
  const sessionList: typeof sessions.$inferInsert[] = [];
  const endDate = new Date();
  
  // Calculate how many sessions should be no-shows (0% attendance)
  const noShowCount = Math.floor(
    config.sessionCount * (1 - config.attendancePercentage / 100)
  );
  const attendanceCount = config.sessionCount - noShowCount;
  
  // Calculate how many sessions should be rescheduled (0% kept)
  const rescheduledCount = Math.floor(
    config.sessionCount * (1 - config.keptPercentage / 100)
  );
  const keptCount = config.sessionCount - rescheduledCount;
  
  // Track first sessions per student
  const studentFirstSessions = new Set<string>();
  
  for (let i = 0; i < config.sessionCount; i++) {
    // Distribute sessions over the time period
    const randomDaysAgo = faker.number.int({ min: 0, max: daysBack });
    const sessionDate = subDays(endDate, randomDaysAgo);
    const sessionTime = faker.date.between({
      from: sessionDate,
      to: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000), // Within same day
    });
    
    // Pick a student
    const student = faker.helpers.arrayElement(studentPool);
    
    // Determine if this is a first session
    const isFirstSession = config.isNewTutor 
      ? i === 0 // Only first session for new tutors
      : !studentFirstSessions.has(student.studentId) && faker.datatype.boolean({ probability: 0.3 });
    
    if (isFirstSession) {
      studentFirstSessions.add(student.studentId);
    }
    
    // Determine if this session should be a no-show
    // We need exactly noShowCount no-shows
    const shouldBeNoShow = i < noShowCount;
    
    // Determine if this session should be rescheduled
    // We need exactly rescheduledCount rescheduled sessions
    const shouldBeRescheduled = i < rescheduledCount;
    
    // Generate session with forced behaviors
    const session = generateMockSession(tutor, student, {
      isFirstSession,
      scheduledStartTime: sessionTime,
      forceNoShow: shouldBeNoShow,
      forceAttendance: !shouldBeNoShow,
      forceRescheduled: shouldBeRescheduled,
      forceNotRescheduled: !shouldBeRescheduled,
      forceRating: config.rating,
    });
    
    sessionList.push(session);
  }
  
  return sessionList;
}

/**
 * Generate mixed sessions (varied metrics)
 */
function generateMixedSessions(
  tutor: MockTutor,
  studentPool: MockStudent[],
  sessionCount: number,
  daysBack: number = 30
): typeof sessions.$inferInsert[] {
  const sessionList: typeof sessions.$inferInsert[] = [];
  const endDate = new Date();
  
  // Track first sessions per student
  const studentFirstSessions = new Set<string>();
  
  for (let i = 0; i < sessionCount; i++) {
    // Distribute sessions over the time period
    const randomDaysAgo = faker.number.int({ min: 0, max: daysBack });
    const sessionDate = subDays(endDate, randomDaysAgo);
    const sessionTime = faker.date.between({
      from: sessionDate,
      to: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000),
    });
    
    // Pick a student
    const student = faker.helpers.arrayElement(studentPool);
    
    // Determine if this is a first session
    const isFirstSession = !studentFirstSessions.has(student.studentId) && 
      faker.datatype.boolean({ probability: 0.3 });
    
    if (isFirstSession) {
      studentFirstSessions.add(student.studentId);
    }
    
    // Generate mixed session (no forced behaviors - let it vary)
    const session = generateMockSession(tutor, student, {
      isFirstSession,
      scheduledStartTime: sessionTime,
      // Use varied rates for mixed behavior
      noShowRate: faker.number.float({ min: 0, max: 0.3 }), // 0-30% no-show rate
      rescheduleRate: faker.number.float({ min: 0, max: 0.3 }), // 0-30% reschedule rate
      // Mixed ratings (2-4 range for variety)
      avgFirstSessionRating: isFirstSession ? faker.number.float({ min: 2, max: 4 }) : undefined,
    });
    
    // Override rating to be more varied (1-5, but weighted toward middle)
    // This ensures we get non-integer averages when multiple sessions are averaged
    // Use a pattern that guarantees variety to produce non-integer averages
    if (session.studentFeedbackRating) {
      // For mixed tutors, ensure we get a good mix of ratings that will produce non-integer averages
      // Use a pattern that cycles through different ratings to guarantee variety
      const sessionIndex = i;
      
      // Create a pattern that ensures variety: cycle through different ratings
      // This ensures we get non-integer averages (e.g., [3, 4, 4] = 3.67, [4, 5, 5] = 4.67)
      // Pattern: 2, 3, 4, 5, 3, 4, 5, 4, 5, 5 (ensures variety)
      const ratingPattern = [2, 3, 4, 5, 3, 4, 5, 4, 5, 5];
      session.studentFeedbackRating = ratingPattern[sessionIndex % ratingPattern.length];
    }
    
    sessionList.push(session);
  }
  
  return sessionList;
}

/**
 * Main seed function
 */
export async function seedPersonas() {
  console.log("🌱 Starting persona data generation...");
  
  // Reset database first
  console.log("\n🔄 Resetting database...");
  await resetDatabase();
  
  // Generate student pool
  console.log("\n👥 Generating students...");
  const studentPool: MockStudent[] = [];
  for (let i = 0; i < 50; i++) {
    studentPool.push(generateMockStudent(i));
  }
  console.log(`   Generated ${studentPool.length} students`);
  
  // Generate tutors and sessions
  console.log("\n📚 Generating tutors and sessions...");
  const allSessions: typeof sessions.$inferInsert[] = [];
  const daysBack = 30;
  
  // 1. Perfect Repeat Tutor (>1 sessions, 100% attendance, 100% kept, 5.0 rating)
  console.log("   Generating Perfect Repeat Tutor...");
  const perfectRepeatTutor = generateMockTutor("excellent", 0);
  const perfectRepeatSessions = generatePersonaSessions(
    perfectRepeatTutor,
    studentPool,
    {
      tutorId: perfectRepeatTutor.tutorId,
      sessionCount: 8, // >1 sessions
      attendancePercentage: 100,
      keptPercentage: 100,
      rating: 5,
    },
    daysBack
  );
  allSessions.push(...perfectRepeatSessions);
  console.log(`     Generated ${perfectRepeatSessions.length} sessions`);
  
  // 2. Perfect New Tutor (1 session, 100% attendance, 100% kept, 5.0 rating)
  console.log("   Generating Perfect New Tutor...");
  const perfectNewTutor = generateMockTutor("excellent", 1);
  const perfectNewSessions = generatePersonaSessions(
    perfectNewTutor,
    studentPool,
    {
      tutorId: perfectNewTutor.tutorId,
      sessionCount: 1,
      attendancePercentage: 100,
      keptPercentage: 100,
      rating: 5,
      isNewTutor: true,
    },
    daysBack
  );
  allSessions.push(...perfectNewSessions);
  console.log(`     Generated ${perfectNewSessions.length} sessions`);
  
  // 3. Terrible Repeat Tutor (>1 sessions, 0% attendance, 0% kept, 1.0 rating)
  console.log("   Generating Terrible Repeat Tutor...");
  const terribleRepeatTutor = generateMockTutor("problematic", 2);
  const terribleRepeatSessions = generatePersonaSessions(
    terribleRepeatTutor,
    studentPool,
    {
      tutorId: terribleRepeatTutor.tutorId,
      sessionCount: 7, // >1 sessions
      attendancePercentage: 0,
      keptPercentage: 0,
      rating: 1,
    },
    daysBack
  );
  allSessions.push(...terribleRepeatSessions);
  console.log(`     Generated ${terribleRepeatSessions.length} sessions`);
  
  // 4. Terrible New Tutor (1 session, 0% attendance, 0% kept, 1.0 rating)
  console.log("   Generating Terrible New Tutor...");
  const terribleNewTutor = generateMockTutor("problematic", 3);
  const terribleNewSessions = generatePersonaSessions(
    terribleNewTutor,
    studentPool,
    {
      tutorId: terribleNewTutor.tutorId,
      sessionCount: 1,
      attendancePercentage: 0,
      keptPercentage: 0,
      rating: 1,
      isNewTutor: true,
    },
    daysBack
  );
  allSessions.push(...terribleNewSessions);
  console.log(`     Generated ${terribleNewSessions.length} sessions`);
  
  // 5. Mixed Most Veteran Tutor (10 sessions, mixed metrics)
  console.log("   Generating Mixed Most Veteran Tutor...");
  const mixedVeteranTutor = generateMockTutor("average", 4);
  const mixedVeteranSessions = generateMixedSessions(
    mixedVeteranTutor,
    studentPool,
    10, // Most sessions
    daysBack
  );
  allSessions.push(...mixedVeteranSessions);
  console.log(`     Generated ${mixedVeteranSessions.length} sessions`);
  
  // 6. 5 Mixed Tutors (2-9 sessions each, mixed metrics)
  console.log("   Generating 5 Mixed Tutors...");
  const mixedTutorSessionCounts = [9, 8, 5, 4, 2]; // Varied session counts between 2-9
  for (let i = 0; i < 5; i++) {
    const mixedTutor = generateMockTutor("average", 5 + i);
    const sessionCount = mixedTutorSessionCounts[i];
    const mixedSessions = generateMixedSessions(
      mixedTutor,
      studentPool,
      sessionCount,
      daysBack
    );
    allSessions.push(...mixedSessions);
    console.log(`     Generated ${mixedSessions.length} sessions for tutor ${mixedTutor.tutorId}`);
  }
  
  console.log(`\n📊 Total sessions generated: ${allSessions.length}`);
  
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
    
    console.log("\n✅ Persona data seeded successfully!");
    console.log(`   Total sessions inserted: ${allSessions.length}`);
    console.log(`   Total tutors: 10 (1 Perfect Repeat, 1 Perfect New, 1 Terrible Repeat, 1 Terrible New, 1 Mixed Veteran, 5 Mixed)`);
    
    // Summary
    console.log("\n📋 Persona Summary:");
    console.log("   1. Perfect Repeat Tutor: 8 sessions, 100% attendance, 100% kept, 5.0 rating");
    console.log("   2. Perfect New Tutor: 1 session, 100% attendance, 100% kept, 5.0 rating");
    console.log("   3. Terrible Repeat Tutor: 7 sessions, 0% attendance, 0% kept, 1.0 rating");
    console.log("   4. Terrible New Tutor: 1 session, 0% attendance, 0% kept, 1.0 rating");
    console.log("   5. Mixed Most Veteran Tutor: 10 sessions, mixed metrics");
    console.log("   6-10. Mixed Tutors: 9, 8, 5, 4, 2 sessions each, mixed metrics");
  } catch (error) {
    console.error("\n❌ Error seeding data:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      if ('cause' in error && error.cause) {
        console.error("Cause:", error.cause);
      }
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedPersonas()
    .then(() => {
      console.log("\n🎉 Persona seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Persona seeding failed:", error);
      process.exit(1);
    });
}

