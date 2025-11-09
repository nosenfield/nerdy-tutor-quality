/**
 * Unit Tests: Webhook Security
 * 
 * Tests for HMAC signature verification utilities.
 * Ensures signature verification works correctly and securely.
 */

import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, extractSignatureFromHeader } from "@/lib/utils/webhook-security";
import crypto from "crypto";

describe("Webhook Signature Verification", () => {
  const secret = "test-secret-key";
  const payload = JSON.stringify({
    session_id: "test_session_123",
    tutor_id: "tutor_456",
    student_id: "student_789",
  });

  describe("verifyWebhookSignature", () => {
    it("should verify valid signature", () => {
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const invalidSignature = "invalid-signature-hex";

      const isValid = verifyWebhookSignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });

    it("should reject signature with wrong secret", () => {
      const wrongSecret = "wrong-secret";
      const signature = crypto
        .createHmac("sha256", wrongSecret)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it("should reject signature for different payload", () => {
      const differentPayload = JSON.stringify({
        session_id: "different_session",
      });
      const signature = crypto
        .createHmac("sha256", secret)
        .update(differentPayload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it("should handle empty payload", () => {
      const emptyPayload = "";
      const signature = crypto
        .createHmac("sha256", secret)
        .update(emptyPayload)
        .digest("hex");

      const isValid = verifyWebhookSignature(emptyPayload, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should handle empty secret", () => {
      const emptySecret = "";
      const signature = crypto
        .createHmac("sha256", emptySecret)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, emptySecret);
      expect(isValid).toBe(true);
    });

    it("should use timing-safe comparison", () => {
      // This test verifies that timingSafeEqual is used
      // (we can't directly test timing, but we can verify it works correctly)
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);

      // Verify it rejects invalid signatures
      const invalidSignature = "a".repeat(signature.length); // Same length
      const isInvalid = verifyWebhookSignature(payload, invalidSignature, secret);
      expect(isInvalid).toBe(false);
    });
  });

  describe("extractSignatureFromHeader", () => {
    it("should extract signature from X-Signature header", () => {
      const signature = "abc123def456";
      const header = signature;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });

    it("should extract signature from X-Webhook-Signature header with prefix", () => {
      const signature = "abc123def456";
      const header = `sha256=${signature}`;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });

    it("should extract signature from X-Hub-Signature-256 header with prefix", () => {
      const signature = "abc123def456";
      const header = `sha256=${signature}`;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });

    it("should handle signature without prefix", () => {
      const signature = "abc123def456";
      const header = signature;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });

    it("should return null for empty header", () => {
      const extracted = extractSignatureFromHeader("");
      expect(extracted).toBeNull();
    });

    it("should return null for null/undefined header", () => {
      expect(extractSignatureFromHeader(null as any)).toBeNull();
      expect(extractSignatureFromHeader(undefined as any)).toBeNull();
    });

    it("should handle signature with whitespace", () => {
      const signature = "abc123def456";
      const header = `  sha256=${signature}  `;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });

    it("should handle multiple equals signs in signature", () => {
      const signature = "abc=123=def=456";
      const header = `sha256=${signature}`;

      const extracted = extractSignatureFromHeader(header);
      expect(extracted).toBe(signature);
    });
  });

  describe("Integration: Signature Verification Flow", () => {
    it("should verify signature correctly in full flow", () => {
      const testPayload = JSON.stringify({
        session_id: "test_123",
        tutor_id: "tutor_456",
      });
      const testSecret = "my-secret-key";

      // Generate signature (as Nerdy would)
      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(testPayload)
        .digest("hex");

      // Extract signature from header (as webhook would)
      const headerValue = `sha256=${signature}`;
      const extractedSignature = extractSignatureFromHeader(headerValue);

      // Verify signature (as our endpoint would)
      const isValid = verifyWebhookSignature(
        testPayload,
        extractedSignature!,
        testSecret
      );

      expect(isValid).toBe(true);
    });

    it("should reject tampered payload", () => {
      const originalPayload = JSON.stringify({
        session_id: "test_123",
        tutor_id: "tutor_456",
      });
      const tamperedPayload = JSON.stringify({
        session_id: "test_123",
        tutor_id: "tutor_999", // Tampered
      });
      const testSecret = "my-secret-key";

      // Generate signature for original payload
      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(originalPayload)
        .digest("hex");

      // Try to verify tampered payload with original signature
      const isValid = verifyWebhookSignature(
        tamperedPayload,
        signature,
        testSecret
      );

      expect(isValid).toBe(false);
    });
  });
});

