import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
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

/**
 * TUTOR_SCORES TABLE
 * Aggregated tutor performance metrics
 *
 * This table stores calculated tutor performance scores over time windows.
 * Used for:
 * - Dashboard display of tutor quality scores
 * - Flag generation (identifying at-risk tutors)
 * - Historical trend analysis
 * - Peer comparison and percentile ranking
 *
 * Scores are recalculated periodically (e.g., daily) and stored with time windows
 * to enable historical analysis and trend detection.
 */
export const tutorScores = pgTable(
  "tutor_scores",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Identity
    tutorId: varchar("tutor_id", { length: 255 }).notNull(),

    // Time window for this score
    calculatedAt: timestamp("calculated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
    }).notNull(), // e.g., 30 days ago
    windowEnd: timestamp("window_end", {
      withTimezone: true,
    }).notNull(), // e.g., today

    // Session counts
    totalSessions: integer("total_sessions").notNull().default(0),
    firstSessions: integer("first_sessions").notNull().default(0),

    // Attendance metrics
    noShowCount: integer("no_show_count").notNull().default(0),
    noShowRate: numeric("no_show_rate", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
    lateCount: integer("late_count").notNull().default(0),
    lateRate: numeric("late_rate", { precision: 5, scale: 4 }),
    avgLatenessMinutes: numeric("avg_lateness_minutes", {
      precision: 6,
      scale: 2,
    }),

    // Completion metrics
    earlyEndCount: integer("early_end_count").notNull().default(0),
    earlyEndRate: numeric("early_end_rate", { precision: 5, scale: 4 }),
    avgEarlyEndMinutes: numeric("avg_early_end_minutes", {
      precision: 6,
      scale: 2,
    }),

    // Rescheduling
    rescheduleCount: integer("reschedule_count").notNull().default(0),
    rescheduleRate: numeric("reschedule_rate", { precision: 5, scale: 4 }),
    tutorInitiatedReschedules: integer(
      "tutor_initiated_reschedules"
    ).notNull().default(0),

    // Ratings
    avgStudentRating: numeric("avg_student_rating", {
      precision: 3,
      scale: 2,
    }), // 1.00 to 5.00
    avgFirstSessionRating: numeric("avg_first_session_rating", {
      precision: 3,
      scale: 2,
    }),
    ratingTrend: varchar("rating_trend", { length: 20 }), // 'improving' | 'stable' | 'declining'

    // Quality score (0-100)
    overallScore: integer("overall_score"),

    // Confidence
    confidenceScore: numeric("confidence_score", {
      precision: 3,
      scale: 2,
    }), // 0.00 to 1.00

    // Metadata
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique constraint: one score per tutor per time window
    tutorWindowUnique: unique("tutor_scores_tutor_window_unique").on(
      table.tutorId,
      table.windowStart,
      table.windowEnd
    ),

    // Indexes for common queries
    tutorIdIdx: index("idx_tutor_scores_tutor").on(table.tutorId),
    calculatedAtIdx: index("idx_tutor_scores_date").on(table.calculatedAt),
    overallScoreIdx: index("idx_overall_score").on(table.overallScore),

    // CHECK constraint for overall_score (0-100)
    overallScoreCheck: check(
      "tutor_scores_overall_score_check",
      sql`${table.overallScore} IS NULL OR (${table.overallScore} >= 0 AND ${table.overallScore} <= 100)`
    ),

    // CHECK constraints for rating fields (1.00-5.00)
    avgStudentRatingCheck: check(
      "tutor_scores_avg_student_rating_check",
      sql`${table.avgStudentRating} IS NULL OR (${table.avgStudentRating} >= 1.00 AND ${table.avgStudentRating} <= 5.00)`
    ),
    avgFirstSessionRatingCheck: check(
      "tutor_scores_avg_first_session_rating_check",
      sql`${table.avgFirstSessionRating} IS NULL OR (${table.avgFirstSessionRating} >= 1.00 AND ${table.avgFirstSessionRating} <= 5.00)`
    ),

    // CHECK constraint for confidence_score (0.00-1.00)
    confidenceScoreCheck: check(
      "tutor_scores_confidence_score_check",
      sql`${table.confidenceScore} IS NULL OR (${table.confidenceScore} >= 0.00 AND ${table.confidenceScore} <= 1.00)`
    ),
  })
);

/**
 * FLAGS TABLE
 * Coaching alerts for at-risk tutors
 *
 * This table stores automated flags generated by the rules engine
 * to alert coaches about tutor performance issues.
 * Used for:
 * - Dashboard display of tutor issues
 * - Coach intervention workflow
 * - Flag resolution tracking
 * - Model validation (coach agreement tracking)
 *
 * Flags can be generated for specific sessions or aggregated patterns
 * (session_id can be NULL for aggregate flags).
 */
export const flags = pgTable(
  "flags",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // What triggered the flag
    tutorId: varchar("tutor_id", { length: 255 }).notNull(),
    sessionId: varchar("session_id", { length: 255 }), // NULL for aggregate flags

    // Flag details
    flagType: varchar("flag_type", { length: 50 }).notNull(), // 'no_show' | 'chronic_lateness' | 'poor_first_session' | etc.
    severity: varchar("severity", { length: 20 }).notNull(), // 'low' | 'medium' | 'high' | 'critical'

    // Description
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),

    // Intervention recommendation
    recommendedAction: text("recommended_action"),

    // Supporting data
    supportingData: jsonb("supporting_data"), // { sessions: [...], metrics: {...} }

    // Status
    status: varchar("status", { length: 20 })
      .notNull()
      .default("open"), // 'open' | 'in_progress' | 'resolved' | 'dismissed'
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
    }),
    resolvedBy: varchar("resolved_by", { length: 255 }), // coach_id
    resolutionNotes: text("resolution_notes"),

    // Coach agreement (for model validation)
    coachAgreed: boolean("coach_agreed"), // Did coach agree this was a real issue?

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
    // Indexes for common queries
    tutorIdIdx: index("idx_flags_tutor").on(table.tutorId),
    statusIdx: index("idx_flags_status").on(table.status),
    severityIdx: index("idx_flags_severity").on(table.severity),
    createdAtIdx: index("idx_flags_created").on(table.createdAt),
  })
);

/**
 * INTERVENTIONS TABLE
 * Track coaching actions taken
 *
 * This table stores coaching interventions made by coaches
 * in response to flags generated for tutors.
 * Used for:
 * - Tracking what actions coaches took
 * - Outcome tracking and follow-up scheduling
 * - Intervention history for tutors
 * - Measuring intervention effectiveness
 *
 * Interventions are linked to flags but can also be created
 * independently if a coach takes action outside the flag system.
 */
export const interventions = pgTable(
  "interventions",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),

    // Reference to flag (nullable - can be independent action)
    flagId: uuid("flag_id").references(() => flags.id),

    // Identity
    tutorId: varchar("tutor_id", { length: 255 }).notNull(),

    // What was done
    interventionType: varchar("intervention_type", { length: 50 }).notNull(), // 'coaching_session' | 'warning' | 'training' | etc.
    description: text("description").notNull(),

    // Who did it
    coachId: varchar("coach_id", { length: 255 }).notNull(),

    // When
    interventionDate: timestamp("intervention_date", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    // Outcome tracking
    followUpDate: timestamp("follow_up_date", {
      withTimezone: true,
    }),
    outcome: varchar("outcome", { length: 20 }), // 'improved' | 'no_change' | 'worsened' | 'pending'
    outcomeNotes: text("outcome_notes"),

    // Metadata
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Indexes for common queries
    tutorIdIdx: index("idx_interventions_tutor").on(table.tutorId),
    flagIdIdx: index("idx_interventions_flag").on(table.flagId),
    interventionDateIdx: index("idx_interventions_date").on(
      table.interventionDate
    ),
  })
);

