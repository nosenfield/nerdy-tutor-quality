CREATE TABLE "flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" varchar(255) NOT NULL,
	"session_id" varchar(255),
	"flag_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"recommended_action" text,
	"supporting_data" jsonb,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" varchar(255),
	"resolution_notes" text,
	"coach_agreed" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid,
	"tutor_id" varchar(255) NOT NULL,
	"intervention_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"coach_id" varchar(255) NOT NULL,
	"intervention_date" timestamp with time zone DEFAULT now() NOT NULL,
	"follow_up_date" timestamp with time zone,
	"outcome" varchar(20),
	"outcome_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"tutor_id" varchar(255) NOT NULL,
	"student_id" varchar(255) NOT NULL,
	"session_start_time" timestamp with time zone NOT NULL,
	"session_end_time" timestamp with time zone NOT NULL,
	"tutor_join_time" timestamp with time zone,
	"student_join_time" timestamp with time zone,
	"tutor_leave_time" timestamp with time zone,
	"student_leave_time" timestamp with time zone,
	"subjects_covered" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_first_session" boolean DEFAULT false NOT NULL,
	"session_type" varchar(50),
	"session_length_scheduled" integer,
	"session_length_actual" integer,
	"was_rescheduled" boolean DEFAULT false NOT NULL,
	"rescheduled_by" varchar(20),
	"reschedule_count" integer DEFAULT 0,
	"tutor_feedback_rating" integer,
	"tutor_feedback_description" text,
	"student_feedback_rating" integer,
	"student_feedback_description" text,
	"video_url" text,
	"transcript_url" text,
	"ai_summary" text,
	"student_booked_followup" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "tutor_feedback_rating_check" CHECK ("sessions"."tutor_feedback_rating" IS NULL OR ("sessions"."tutor_feedback_rating" >= 1 AND "sessions"."tutor_feedback_rating" <= 5)),
	CONSTRAINT "student_feedback_rating_check" CHECK ("sessions"."student_feedback_rating" IS NULL OR ("sessions"."student_feedback_rating" >= 1 AND "sessions"."student_feedback_rating" <= 5))
);
--> statement-breakpoint
CREATE TABLE "tutor_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" varchar(255) NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"first_sessions" integer DEFAULT 0 NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"no_show_rate" numeric(5, 4),
	"late_count" integer DEFAULT 0 NOT NULL,
	"late_rate" numeric(5, 4),
	"avg_lateness_minutes" numeric(6, 2),
	"early_end_count" integer DEFAULT 0 NOT NULL,
	"early_end_rate" numeric(5, 4),
	"avg_early_end_minutes" numeric(6, 2),
	"reschedule_count" integer DEFAULT 0 NOT NULL,
	"reschedule_rate" numeric(5, 4),
	"tutor_initiated_reschedules" integer DEFAULT 0 NOT NULL,
	"avg_student_rating" numeric(3, 2),
	"avg_first_session_rating" numeric(3, 2),
	"rating_trend" varchar(20),
	"overall_score" integer,
	"confidence_score" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_scores_tutor_window_unique" UNIQUE("tutor_id","window_start","window_end"),
	CONSTRAINT "tutor_scores_overall_score_check" CHECK ("tutor_scores"."overall_score" IS NULL OR ("tutor_scores"."overall_score" >= 0 AND "tutor_scores"."overall_score" <= 100)),
	CONSTRAINT "tutor_scores_avg_student_rating_check" CHECK ("tutor_scores"."avg_student_rating" IS NULL OR ("tutor_scores"."avg_student_rating" >= 1.00 AND "tutor_scores"."avg_student_rating" <= 5.00)),
	CONSTRAINT "tutor_scores_avg_first_session_rating_check" CHECK ("tutor_scores"."avg_first_session_rating" IS NULL OR ("tutor_scores"."avg_first_session_rating" >= 1.00 AND "tutor_scores"."avg_first_session_rating" <= 5.00)),
	CONSTRAINT "tutor_scores_confidence_score_check" CHECK ("tutor_scores"."confidence_score" IS NULL OR ("tutor_scores"."confidence_score" >= 0.00 AND "tutor_scores"."confidence_score" <= 1.00))
);
--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_flag_id_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_flags_tutor" ON "flags" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "idx_flags_status" ON "flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_flags_severity" ON "flags" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_flags_created" ON "flags" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_interventions_tutor" ON "interventions" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "idx_interventions_flag" ON "interventions" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "idx_interventions_date" ON "interventions" USING btree ("intervention_date");--> statement-breakpoint
CREATE INDEX "idx_tutor_id" ON "sessions" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "idx_student_id" ON "sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_session_date" ON "sessions" USING btree ("session_start_time");--> statement-breakpoint
CREATE INDEX "idx_first_session" ON "sessions" USING btree ("is_first_session");--> statement-breakpoint
CREATE INDEX "idx_created_at" ON "sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tutor_scores_tutor" ON "tutor_scores" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "idx_tutor_scores_date" ON "tutor_scores" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "idx_overall_score" ON "tutor_scores" USING btree ("overall_score");