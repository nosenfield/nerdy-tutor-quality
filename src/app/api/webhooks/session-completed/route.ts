/**
 * Webhook Endpoint: Session Completed
 * 
 * Receives session completion events from Nerdy platform.
 * Validates payload, stores session in database, and queues processing job.
 * 
 * Flow:
 * 1. Get raw request body
 * 2. Verify HMAC signature
 * 3. Parse and validate payload with Zod
 * 4. Transform webhook payload to database format
 * 5. Store session in database
 * 6. Queue processing job (async, don't await)
 * 7. Return 200 OK quickly (< 2 seconds)
 * 
 * POST /api/webhooks/session-completed
 */

import { NextRequest, NextResponse } from "next/server";
import { webhookPayloadSchema, type WebhookPayload } from "@/lib/utils/validation";
import { db, sessions } from "@/lib/db";
import { sessionQueue } from "@/lib/queue";
import { JOB_TYPES } from "@/lib/queue/jobs";
import { differenceInMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import {
  verifyWebhookSignature,
  extractSignatureFromHeader,
  getWebhookSecret,
} from "@/lib/utils/webhook-security";
import {
  checkRateLimit,
  extractIpAddress,
  WEBHOOK_RATE_LIMIT,
} from "@/lib/utils/rate-limit";
import { createRedisConnection } from "@/lib/queue";

/**
 * Transform webhook payload to database format
 * 
 * Converts snake_case webhook fields to camelCase database fields
 * and calculates computed fields (session lengths).
 */
function transformWebhookToDatabase(payload: WebhookPayload) {
  // Parse timestamps
  const sessionStartTime = new Date(payload.session_start_time);
  const sessionEndTime = new Date(payload.session_end_time);
  const tutorJoinTime = payload.tutor_join_time ? new Date(payload.tutor_join_time) : null;
  const studentJoinTime = payload.student_join_time ? new Date(payload.student_join_time) : null;
  const tutorLeaveTime = payload.tutor_leave_time ? new Date(payload.tutor_leave_time) : null;
  const studentLeaveTime = payload.student_leave_time ? new Date(payload.student_leave_time) : null;

  // Calculate session lengths (in minutes)
  const sessionLengthScheduled = differenceInMinutes(sessionEndTime, sessionStartTime);
  const sessionLengthActual = tutorJoinTime && tutorLeaveTime
    ? differenceInMinutes(tutorLeaveTime, tutorJoinTime)
    : null;

  // Transform to database format
  return {
    sessionId: payload.session_id,
    tutorId: payload.tutor_id,
    studentId: payload.student_id,
    sessionStartTime,
    sessionEndTime,
    tutorJoinTime,
    studentJoinTime,
    tutorLeaveTime,
    studentLeaveTime,
    subjectsCovered: payload.subjects_covered || [],
    isFirstSession: payload.is_first_session || false,
    sessionType: null, // Not provided in webhook payload
    sessionLengthScheduled,
    sessionLengthActual,
    wasRescheduled: payload.was_rescheduled || false,
    rescheduledBy: payload.rescheduled_by || null,
    rescheduleCount: payload.was_rescheduled ? 1 : 0,
    tutorFeedbackRating: payload.tutor_feedback?.rating || null,
    tutorFeedbackDescription: payload.tutor_feedback?.description || null,
    studentFeedbackRating: payload.student_feedback?.rating || null,
    studentFeedbackDescription: payload.student_feedback?.description || null,
    videoUrl: payload.video_url || null,
    transcriptUrl: payload.transcript_url || null,
    aiSummary: payload.ai_summary || null,
    studentBookedFollowup: null, // Not provided in webhook payload
  };
}

/**
 * Handle POST requests - receive session completion webhook
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    // Extract IP address for rate limiting
    const ip = extractIpAddress(request);

    // Check rate limit (before signature verification to save compute)
    let rateLimitResult;
    try {
      const redis = createRedisConnection();
      rateLimitResult = await checkRateLimit(
        redis,
        ip,
        "/api/webhooks/session-completed",
        WEBHOOK_RATE_LIMIT
      );
    } catch (error) {
      // If Redis fails, allow request (fail open)
      // Log error but don't block legitimate traffic
      console.error("Rate limit check failed, allowing request:", error);
      rateLimitResult = {
        allowed: true,
        limit: WEBHOOK_RATE_LIMIT.limit,
        remaining: WEBHOOK_RATE_LIMIT.limit,
        reset: Date.now() + WEBHOOK_RATE_LIMIT.windowMs,
      };
    }

    // If rate limit exceeded, return 429
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP ${ip}`);
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Get raw request body as string for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    const signatureHeader =
      request.headers.get("X-Signature") ||
      request.headers.get("X-Webhook-Signature") ||
      request.headers.get("X-Hub-Signature-256");

    const webhookSecret = getWebhookSecret();

    if (!webhookSecret) {
      console.error("WEBHOOK_SECRET not set in environment variables");
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "Webhook secret not configured",
        },
        { status: 500 }
      );
    }

    if (!signatureHeader) {
      console.error("Webhook signature header missing");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Missing signature header",
        },
        { status: 401 }
      );
    }

    const signature = extractSignatureFromHeader(signatureHeader);

    if (!signature) {
      console.error("Invalid signature format in header");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid signature format",
        },
        { status: 401 }
      );
    }

    const isValidSignature = verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!isValidSignature) {
      console.error("Webhook signature verification failed");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid signature",
        },
        { status: 401 }
      );
    }

    // Parse request body as JSON
    const body = JSON.parse(rawBody);

    // Validate payload with Zod
    const validationResult = webhookPayloadSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Webhook validation failed:", validationResult.error);
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const payload = validationResult.data;
    sessionId = payload.session_id;

    console.log(`Webhook received for session ${sessionId} (tutor: ${payload.tutor_id})`);

    // Transform webhook payload to database format
    const sessionData = transformWebhookToDatabase(payload);

    // Store session in database
    // Handle duplicate session_id: if exists, return 409 Conflict
    try {
      await db.insert(sessions).values(sessionData);
      console.log(`Session ${sessionId} stored in database`);
    } catch (error: any) {
      // Log detailed database error for debugging
      console.error("Database insert error:", {
        code: error?.code,
        message: error?.message,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column,
        dataType: error?.dataType,
        cause: error?.cause,
      });
      
      // Check if it's a unique constraint violation
      // PostgreSQL error code 23505 = unique_violation
      // Also check error.cause for Drizzle-wrapped errors
      const isDuplicateError = 
        error?.code === "23505" || 
        error?.message?.includes("unique") ||
        error?.cause?.message?.includes("duplicate key") ||
        error?.cause?.message?.includes("unique constraint");
      
      if (isDuplicateError) {
        console.warn(`Session ${sessionId} already exists in database`);
        return NextResponse.json(
          {
            error: "Session already exists",
            session_id: sessionId,
          },
          { status: 409 }
        );
      }
      // Re-throw other database errors
      throw error;
    }

    // Queue processing job (async, don't await)
    // Determine priority: high for first sessions, normal otherwise
    const priority = payload.is_first_session ? "high" : "normal";

    const jobData = {
      sessionId: payload.session_id,
      tutorId: payload.tutor_id,
      isFirstSession: payload.is_first_session || false,
      priority,
    };

    // Queue job (fire and forget - don't await)
    // Use priority in job options (Bull handles priority automatically)
    sessionQueue
      .add(JOB_TYPES.PROCESS_SESSION, jobData, {
        priority: priority === "high" ? 1 : 5,
      })
      .then((job) => {
        console.log(`Job queued for session ${sessionId}: ${job.id}`);
      })
      .catch((error) => {
        // Log error but don't fail the webhook
        // Session is saved, can retry processing later
        console.error(`Failed to queue job for session ${sessionId}:`, error);
      });

    // Return success quickly (< 2 seconds)
    const elapsed = Date.now() - startTime;
    console.log(`Webhook processed for session ${sessionId} in ${elapsed}ms`);

    return NextResponse.json(
      {
        success: true,
        session_id: sessionId,
        queued: true,
        message: "Session received and queued for processing",
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
        },
      }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error(`Error processing webhook for session ${sessionId || "unknown"}:`, error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if ('cause' in error && error.cause) {
        console.error("Error cause:", error.cause);
      }
    } else {
      console.error("Error object:", JSON.stringify(error, null, 2));
    }

    // Return generic error (don't expose internal details in production)
    // In development, include more details
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Extract PostgreSQL error details if available
    const pgError = error && typeof error === 'object' && 'code' in error ? {
      code: (error as any).code,
      detail: (error as any).detail,
      constraint: (error as any).constraint,
      table: (error as any).table,
      column: (error as any).column,
    } : null;
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process webhook",
        ...(isDevelopment && error instanceof Error && {
          details: {
            name: error.name,
            message: error.message,
            ...(pgError && { pgError }),
          },
        }),
      },
      { status: 500 }
    );
  }
}

