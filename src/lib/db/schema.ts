import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * SESSIONS TABLE
 * Raw session data from Nerdy webhooks
 *
 * This table stores all session data received from webhooks.
 * Used for:
 * - Rules engine processing (no-shows, lateness, etc.)
 * - Tutor scoring calculations
 * - Dashboard display and analytics
 * - Flag generation
 */
export const sessions = pgTable(
  "sessions",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Identity
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    tutorId: varchar("tutor_id", { length: 255 }).notNull(),
    studentId: varchar("student_id", { length: 255 }).notNull(),

    // Timing (scheduled)
    sessionStartTime: timestamp("session_start_time", {
      withTimezone: true,
    }).notNull(),
    sessionEndTime: timestamp("session_end_time", {
      withTimezone: true,
    }).notNull(),

    // Timing (actual - joins)
    tutorJoinTime: timestamp("tutor_join_time", {
      withTimezone: true,
    }),
    studentJoinTime: timestamp("student_join_time", {
      withTimezone: true,
    }),

    // Timing (actual - leaves)
    tutorLeaveTime: timestamp("tutor_leave_time", {
      withTimezone: true,
    }),
    studentLeaveTime: timestamp("student_leave_time", {
      withTimezone: true,
    }),

    // Content
    subjectsCovered: text("subjects_covered")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isFirstSession: boolean("is_first_session").notNull().default(false),
    sessionType: varchar("session_type", { length: 50 }),

    // Computed fields (for convenience)
    sessionLengthScheduled: integer("session_length_scheduled"), // minutes
    sessionLengthActual: integer("session_length_actual"), // minutes

    // Rescheduling
    wasRescheduled: boolean("was_rescheduled").notNull().default(false),
    rescheduledBy: varchar("rescheduled_by", { length: 20 }), // 'tutor' | 'student' | 'system'
    rescheduleCount: integer("reschedule_count").default(0),

    // Ratings
    tutorFeedbackRating: integer("tutor_feedback_rating"), // 1-5
    tutorFeedbackDescription: text("tutor_feedback_description"),
    studentFeedbackRating: integer("student_feedback_rating"), // 1-5
    studentFeedbackDescription: text("student_feedback_description"),

    // Deep analysis (future - Phase 2)
    videoUrl: text("video_url"),
    transcriptUrl: text("transcript_url"),
    aiSummary: text("ai_summary"),

    // Outcomes
    studentBookedFollowup: boolean("student_booked_followup"),

    // Metadata
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique constraint on session_id
    sessionIdUnique: unique("sessions_session_id_unique").on(table.sessionId),

    // Indexes for common queries
    tutorIdIdx: index("idx_tutor_id").on(table.tutorId),
    studentIdIdx: index("idx_student_id").on(table.studentId),
    sessionDateIdx: index("idx_session_date").on(table.sessionStartTime),
    firstSessionIdx: index("idx_first_session").on(table.isFirstSession),
    createdAtIdx: index("idx_created_at").on(table.createdAt),

    // CHECK constraints for rating fields
    tutorRatingCheck: check(
      "tutor_feedback_rating_check",
      sql`${table.tutorFeedbackRating} IS NULL OR (${table.tutorFeedbackRating} >= 1 AND ${table.tutorFeedbackRating} <= 5)`
    ),
    studentRatingCheck: check(
      "student_feedback_rating_check",
      sql`${table.studentFeedbackRating} IS NULL OR (${table.studentFeedbackRating} >= 1 AND ${table.studentFeedbackRating} <= 5)`
    ),
  })
);

