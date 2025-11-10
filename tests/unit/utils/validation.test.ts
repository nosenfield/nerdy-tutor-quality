/**
 * Unit Tests: Validation Schemas
 * 
 * Tests for Zod validation schemas used in webhook and API endpoints.
 * Ensures all validation rules work correctly.
 */

import { describe, it, expect } from "vitest";
import { webhookPayloadSchema, type WebhookPayload } from "@/lib/utils/validation";

describe("Webhook Payload Validation", () => {
  /**
   * Create a valid webhook payload for testing
   */
  function createValidPayload(overrides?: Partial<WebhookPayload>): WebhookPayload {
    const now = new Date();
    const sessionStartTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const sessionEndTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const tutorJoinTime = new Date(sessionStartTime.getTime() + 5 * 60 * 1000); // 5 min late

    return {
      session_id: "test_session_123",
      tutor_id: "tutor_456",
      student_id: "student_789",
      session_start_time: sessionStartTime.toISOString(),
      session_end_time: sessionEndTime.toISOString(),
      tutor_join_time: tutorJoinTime.toISOString(),
      student_join_time: tutorJoinTime.toISOString(),
      tutor_leave_time: sessionEndTime.toISOString(),
      student_leave_time: sessionEndTime.toISOString(),
      subjects_covered: ["Math", "Algebra"],
      is_first_session: false,
      was_rescheduled: false,
      ...overrides,
    };
  }

  describe("Valid Payloads", () => {
    it("should accept valid payload with all required fields", () => {
      const payload = createValidPayload();
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.session_id).toBe("test_session_123");
        expect(result.data.tutor_id).toBe("tutor_456");
        expect(result.data.student_id).toBe("student_789");
      }
    });

    it("should accept payload with minimal required fields", () => {
      const payload = {
        session_id: "test_session_123",
        tutor_id: "tutor_456",
        student_id: "student_789",
        session_start_time: new Date().toISOString(),
        session_end_time: new Date().toISOString(),
      };
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subjects_covered).toEqual([]); // Default value
        expect(result.data.is_first_session).toBe(false); // Default value
        expect(result.data.was_rescheduled).toBe(false); // Default value
      }
    });

    it("should accept payload with optional fields", () => {
      const payload = createValidPayload({
        tutor_join_time: null,
        student_join_time: null,
        tutor_feedback: {
          rating: 5,
          description: "Great session",
        },
        student_feedback: {
          rating: 4,
          description: "Very helpful",
        },
        video_url: "https://example.com/video.mp4",
        transcript_url: "https://example.com/transcript.txt",
        ai_summary: "Session focused on algebra fundamentals",
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutor_join_time).toBeNull();
        expect(result.data.tutor_feedback?.rating).toBe(5);
        expect(result.data.video_url).toBe("https://example.com/video.mp4");
      }
    });

    it("should apply default values for optional fields", () => {
      const payload = {
        session_id: "test_session_123",
        tutor_id: "tutor_456",
        student_id: "student_789",
        session_start_time: new Date().toISOString(),
        session_end_time: new Date().toISOString(),
      };
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subjects_covered).toEqual([]);
        expect(result.data.is_first_session).toBe(false);
        expect(result.data.was_rescheduled).toBe(false);
      }
    });
  });

  describe("Invalid Payloads - Required Fields", () => {
    it("should reject payload missing session_id", () => {
      const payload = createValidPayload();
      delete (payload as any).session_id;
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_id"))).toBe(true);
      }
    });

    it("should reject payload with empty session_id", () => {
      const payload = createValidPayload({ session_id: "" });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_id"))).toBe(true);
      }
    });

    it("should reject payload missing tutor_id", () => {
      const payload = createValidPayload();
      delete (payload as any).tutor_id;
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("tutor_id"))).toBe(true);
      }
    });

    it("should reject payload missing student_id", () => {
      const payload = createValidPayload();
      delete (payload as any).student_id;
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("student_id"))).toBe(true);
      }
    });

    it("should reject payload missing session_start_time", () => {
      const payload = createValidPayload();
      delete (payload as any).session_start_time;
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_start_time"))).toBe(true);
      }
    });

    it("should reject payload missing session_end_time", () => {
      const payload = createValidPayload();
      delete (payload as any).session_end_time;
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_end_time"))).toBe(true);
      }
    });
  });

  describe("Invalid Payloads - Field Types", () => {
    it("should reject invalid date format for session_start_time", () => {
      const payload = createValidPayload({ session_start_time: "invalid-date" });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_start_time"))).toBe(true);
      }
    });

    it("should reject invalid date format for session_end_time", () => {
      const payload = createValidPayload({ session_end_time: "not-a-date" });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("session_end_time"))).toBe(true);
      }
    });

    it("should reject invalid type for is_first_session", () => {
      const payload = createValidPayload({ is_first_session: "true" as any });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("is_first_session"))).toBe(true);
      }
    });

    it("should reject invalid type for was_rescheduled", () => {
      const payload = createValidPayload({ was_rescheduled: 1 as any });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("was_rescheduled"))).toBe(true);
      }
    });

    it("should reject invalid type for subjects_covered", () => {
      const payload = createValidPayload({ subjects_covered: "Math" as any });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("subjects_covered"))).toBe(true);
      }
    });
  });

  describe("Invalid Payloads - Enum Values", () => {
    it("should reject invalid rescheduled_by value", () => {
      const payload = createValidPayload({ rescheduled_by: "invalid" as any });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("rescheduled_by"))).toBe(true);
      }
    });

    it("should accept valid rescheduled_by values", () => {
      const validValues = ["tutor", "student", "system"] as const;
      
      for (const value of validValues) {
        const payload = createValidPayload({ rescheduled_by: value });
        const result = webhookPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Invalid Payloads - Feedback Ratings", () => {
    it("should reject rating below 1", () => {
      const payload = createValidPayload({
        tutor_feedback: {
          rating: 0,
          description: "Test",
        },
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("tutor_feedback") || issue.path.includes("rating"))).toBe(true);
      }
    });

    it("should reject rating above 5", () => {
      const payload = createValidPayload({
        student_feedback: {
          rating: 6,
          description: "Test",
        },
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("student_feedback") || issue.path.includes("rating"))).toBe(true);
      }
    });

    it("should reject non-integer rating", () => {
      const payload = createValidPayload({
        tutor_feedback: {
          rating: 3.5,
          description: "Test",
        },
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("rating"))).toBe(true);
      }
    });

    it("should accept valid ratings (1-5)", () => {
      for (let rating = 1; rating <= 5; rating++) {
        const payload = createValidPayload({
          tutor_feedback: {
            rating,
            description: "Test",
          },
        });
        const result = webhookPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Invalid Payloads - URL Fields", () => {
    it("should reject invalid video_url format", () => {
      const payload = createValidPayload({ video_url: "not-a-url" });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("video_url"))).toBe(true);
      }
    });

    it("should reject invalid transcript_url format", () => {
      const payload = createValidPayload({ transcript_url: "not a valid url" });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("transcript_url"))).toBe(true);
      }
    });

    it("should accept valid URLs", () => {
      const payload = createValidPayload({
        video_url: "https://example.com/video.mp4",
        transcript_url: "https://example.com/transcript.txt",
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null values for optional timestamp fields", () => {
      const payload = createValidPayload({
        tutor_join_time: null,
        student_join_time: null,
        tutor_leave_time: null,
        student_leave_time: null,
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutor_join_time).toBeNull();
        expect(result.data.student_join_time).toBeNull();
      }
    });

    it("should handle empty subjects_covered array", () => {
      const payload = createValidPayload({ subjects_covered: [] });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subjects_covered).toEqual([]);
      }
    });

    it("should handle first session flag", () => {
      const payload = createValidPayload({ is_first_session: true });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_first_session).toBe(true);
      }
    });

    it("should handle rescheduled session", () => {
      const payload = createValidPayload({
        was_rescheduled: true,
        rescheduled_by: "tutor",
      });
      const result = webhookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.was_rescheduled).toBe(true);
        expect(result.data.rescheduled_by).toBe("tutor");
      }
    });
  });
});

