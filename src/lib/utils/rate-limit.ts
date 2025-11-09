/**
 * Rate Limiting Utilities
 * 
 * Implements rate limiting using Redis with sliding window algorithm.
 * Protects API endpoints from abuse and ensures fair usage.
 */

import type Redis from "ioredis";
import type { NextRequest } from "next/server";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum number of requests allowed */
  limit: number;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit resets */
  reset: number;
}

/**
 * Check rate limit for an IP address
 * 
 * Uses sliding window algorithm with Redis:
 * - Increments counter for IP + endpoint
 * - Sets TTL on key to expire after window
 * - Returns rate limit status and headers
 * 
 * @param redis - Redis connection
 * @param ip - IP address to check
 * @param endpoint - API endpoint path
 * @param config - Rate limit configuration
 * @returns Rate limit result with status and headers
 */
export async function checkRateLimit(
  redis: Redis,
  ip: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rate_limit:${endpoint}:${ip}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Increment counter and get current count
    const count = await redis.incr(key);

    // Set expiration on first request (when count is 1)
    if (count === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const reset = now + (ttl > 0 ? ttl * 1000 : config.windowMs);

    const allowed = count <= config.limit;
    const remaining = Math.max(0, config.limit - count);

    return {
      allowed,
      limit: config.limit,
      remaining,
      reset,
    };
  } catch (error) {
    // If Redis fails, allow request (fail open)
    // Log error for monitoring but don't block legitimate traffic
    console.error("Rate limit check failed:", error);

    return {
      allowed: true, // Fail open - allow request
      limit: config.limit,
      remaining: config.limit, // Assume full limit available
      reset: now + config.windowMs,
    };
  }
}

/**
 * Extract IP address from request
 * 
 * Checks headers in order of preference:
 * 1. X-Real-IP (set by reverse proxy)
 * 2. X-Forwarded-For (first IP in chain)
 * 3. request.ip (direct connection)
 * 4. "unknown" (fallback)
 * 
 * @param request - Next.js request object
 * @returns IP address string
 */
export function extractIpAddress(request: NextRequest | Request): string {
  // Try X-Real-IP first (most reliable, set by reverse proxy)
  const realIp = request.headers.get("X-Real-IP") || request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Try X-Forwarded-For (may contain multiple IPs)
  const forwardedFor = request.headers.get("X-Forwarded-For") || request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take first IP in chain (original client)
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) {
      return firstIp;
    }
  }

  // Fallback to request IP (if available)
  if ("ip" in request && request.ip) {
    return request.ip;
  }

  // Final fallback
  return "unknown";
}

/**
 * Default rate limit configuration for webhook endpoint
 */
export const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  limit: 100, // 100 requests
  windowMs: 60 * 1000, // per minute
};

