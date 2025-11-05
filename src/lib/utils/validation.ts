import { z } from "zod";

/**
 * Validation Schemas
 * 
 * Zod schemas for validating webhook payloads and API requests.
 * Ensures type safety and runtime validation.
 */

/**
 * Feedback schema for tutor/student feedback
 */
const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  description: z.string(),
});

/**
 * Webhook payload schema for session-completed endpoint
 * 
 * Validates incoming webhook payloads from Nerdy platform.
 * Matches the WebhookPayload interface from architecture.md
 */
export const webhookPayloadSchema = z.object({
  session_id: z.string().min(1),
  tutor_id: z.string().min(1),
  student_id: z.string().min(1),
  session_start_time: z.string().datetime(), // ISO 8601
  session_end_time: z.string().datetime(),
  tutor_join_time: z.string().datetime().nullable().optional(),
  student_join_time: z.string().datetime().nullable().optional(),
  tutor_leave_time: z.string().datetime().nullable().optional(),
  student_leave_time: z.string().datetime().nullable().optional(),
  subjects_covered: z.array(z.string()).default([]),
  is_first_session: z.boolean().default(false),
  was_rescheduled: z.boolean().default(false),
  rescheduled_by: z.enum(["tutor", "student", "system"]).optional(),
  tutor_feedback: feedbackSchema.optional(),
  student_feedback: feedbackSchema.optional(),
  video_url: z.string().url().optional(),
  transcript_url: z.string().url().optional(),
  ai_summary: z.string().optional(),
});

/**
 * Type inferred from webhook payload schema
 */
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

/**
 * Resolve flag request schema
 */
export const resolveFlagSchema = z.object({
  resolution_notes: z.string().min(1),
  coach_agreed: z.boolean(),
  intervention_type: z.string().optional(),
  intervention_description: z.string().optional(),
});

/**
 * Type inferred from resolve flag schema
 */
export type ResolveFlagRequest = z.infer<typeof resolveFlagSchema>;

/**
 * Sessions query parameters schema
 */
export const sessionsQuerySchema = z.object({
  tutor_id: z.string().optional(),
  student_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_first_session: z.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Type inferred from sessions query schema
 */
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

/**
 * Flags query parameters schema
 */
export const flagsQuerySchema = z.object({
  tutor_id: z.string().optional(),
  status: z.enum(["open", "in_progress", "resolved", "dismissed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Type inferred from flags query schema
 */
export type FlagsQuery = z.infer<typeof flagsQuerySchema>;

/**
 * Tutors query parameters schema
 */
export const tutorsQuerySchema = z.object({
  sort_by: z.enum(["score", "name", "session_count"]).optional(),
  min_score: z.coerce.number().int().min(0).max(100).optional(),
  max_score: z.coerce.number().int().min(0).max(100).optional(),
  has_flags: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Type inferred from tutors query schema
 */
export type TutorsQuery = z.infer<typeof tutorsQuerySchema>;

