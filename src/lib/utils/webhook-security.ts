/**
 * Webhook Security Utilities
 * 
 * HMAC signature verification for webhook requests.
 * Ensures webhook requests are authentic and from trusted sources.
 */

import crypto from "crypto";

/**
 * Verify webhook signature using HMAC-SHA256
 * 
 * Compares the provided signature with the expected signature computed
 * from the payload and secret using constant-time comparison to prevent
 * timing attacks.
 * 
 * @param payload - Raw request body as string
 * @param signature - Signature from request header (hex string)
 * @param secret - Webhook secret from environment variable
 * @returns True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  // Return false if signature is missing
  if (!signature) {
    return false;
  }

  // Note: Empty secret is technically valid for HMAC (though not recommended)
  // We allow it here, but should validate secret is set in production

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    // Ensure both signatures are the same length (required for timingSafeEqual)
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    // If signature is not valid hex, return false
    return false;
  }
}

/**
 * Extract signature from webhook header
 * 
 * Supports common webhook signature header formats:
 * - Plain hex: "abc123def456"
 * - With prefix: "sha256=abc123def456"
 * - With whitespace: "  sha256=abc123def456  "
 * 
 * @param headerValue - Value from signature header (e.g., X-Signature, X-Webhook-Signature)
 * @returns Extracted signature (hex string) or null if invalid
 */
export function extractSignatureFromHeader(
  headerValue: string | null | undefined
): string | null {
  if (!headerValue) {
    return null;
  }

  // Trim whitespace
  const trimmed = headerValue.trim();

  // Check if header has prefix (e.g., "sha256=abc123")
  if (trimmed.includes("=")) {
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      // Take everything after the first "=" (in case signature contains "=")
      const signature = parts.slice(1).join("=");
      return signature.trim();
    }
  }

  // No prefix, return as-is (assuming it's already hex)
  return trimmed || null;
}

/**
 * Get webhook secret from environment variable
 * 
 * @returns Webhook secret or null if not set
 */
export function getWebhookSecret(): string | null {
  return process.env.WEBHOOK_SECRET || null;
}

