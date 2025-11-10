/**
 * Unit Tests: Rate Limiting
 * 
 * Tests for rate limiting utilities using Redis.
 * Ensures rate limiting works correctly with sliding window algorithm.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, extractIpAddress } from "@/lib/utils/rate-limit";
import { createRedisConnection } from "@/lib/queue";
import type Redis from "ioredis";

describe("Rate Limiting", () => {
  let redis: Redis;
  const testIp = "192.168.1.100";
  const testEndpoint = "/api/webhooks/session-completed";

  beforeEach(async () => {
    // Create Redis connection for testing
    try {
      redis = createRedisConnection();
      // Clean up test keys
      await redis.del(`rate_limit:${testEndpoint}:${testIp}`);
    } catch (error) {
      // Redis not available - skip tests
      console.warn("Redis not available - skipping rate limit tests");
    }
  });

  afterEach(async () => {
    if (redis) {
      // Clean up test keys
      await redis.del(`rate_limit:${testEndpoint}:${testIp}`);
      redis.disconnect();
    }
  });

  describe("checkRateLimit", () => {
    it("should allow request when under limit", async () => {
      if (!redis) {
        console.log("Skipping test - Redis not available");
        return;
      }

      const result = await checkRateLimit(redis, testIp, testEndpoint, {
        limit: 100,
        windowMs: 60 * 1000, // 1 minute
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.remaining).toBeLessThanOrEqual(100);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it("should block request when over limit", async () => {
      if (!redis) {
        console.log("Skipping test - Redis not available");
        return;
      }

      // Use a smaller limit for faster testing
      const limit = 10;
      const testKey = `rate_limit:${testEndpoint}:${testIp}:test2`;

      // Make requests to hit the limit
      for (let i = 0; i < limit; i++) {
        await redis.incr(testKey);
      }
      await redis.expire(testKey, 60);

      // Check rate limit (should be blocked)
      const result = await checkRateLimit(redis, `${testIp}:test2`, testEndpoint, {
        limit,
        windowMs: 60 * 1000,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(Date.now());

      // Clean up
      await redis.del(testKey);
    }, 10000);

    it("should reset after window expires", async () => {
      if (!redis) {
        console.log("Skipping test - Redis not available");
        return;
      }

      const limit = 5;
      const windowMs = 1000; // 1 second window for testing
      const testKey = `rate_limit:${testEndpoint}:${testIp}:test3`;

      // Make requests to hit the limit
      for (let i = 0; i < limit; i++) {
        await redis.incr(testKey);
      }
      await redis.expire(testKey, Math.ceil(windowMs / 1000));

      // Should be blocked
      const blocked = await checkRateLimit(redis, `${testIp}:test3`, testEndpoint, {
        limit,
        windowMs,
      });
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again (key expired)
      const allowed = await checkRateLimit(redis, `${testIp}:test3`, testEndpoint, {
        limit,
        windowMs,
      });
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBeGreaterThan(0);

      // Clean up
      await redis.del(testKey);
    }, 10000);

    it("should handle different IP addresses separately", async () => {
      if (!redis) {
        console.log("Skipping test - Redis not available");
        return;
      }

      const ip1 = "192.168.1.1:test4";
      const ip2 = "192.168.1.2:test4";
      const limit = 10;

      // Make requests from IP1 to hit the limit
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(redis, ip1, testEndpoint, {
          limit,
          windowMs: 60 * 1000,
        });
      }

      // IP1 should be blocked
      const result1 = await checkRateLimit(redis, ip1, testEndpoint, {
        limit,
        windowMs: 60 * 1000,
      });
      expect(result1.allowed).toBe(false);

      // IP2 should still be allowed
      const result2 = await checkRateLimit(redis, ip2, testEndpoint, {
        limit,
        windowMs: 60 * 1000,
      });
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBeGreaterThan(0);

      // Clean up
      await redis.del(`rate_limit:${testEndpoint}:${ip1}`);
      await redis.del(`rate_limit:${testEndpoint}:${ip2}`);
    }, 10000);

    it("should handle Redis connection errors gracefully", async () => {
      // Create a mock Redis that throws errors
      const mockRedis = {
        incr: vi.fn().mockRejectedValue(new Error("Redis connection failed")),
        expire: vi.fn(),
        ttl: vi.fn(),
      } as any;

      const result = await checkRateLimit(mockRedis, testIp, testEndpoint, {
        limit: 100,
        windowMs: 60 * 1000,
      });

      // Should allow request when Redis fails (fail open)
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100); // Default to limit
    });

    it("should return correct rate limit headers", async () => {
      if (!redis) {
        console.log("Skipping test - Redis not available");
        return;
      }

      const result = await checkRateLimit(redis, testIp, testEndpoint, {
        limit: 100,
        windowMs: 60 * 1000,
      });

      expect(result.limit).toBe(100);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.remaining).toBeLessThanOrEqual(100);
      expect(result.reset).toBeGreaterThan(Date.now());
      expect(result.reset).toBeLessThan(Date.now() + 70 * 1000); // Within 70 seconds
    });
  });

  describe("extractIpAddress", () => {
    it("should extract IP from X-Forwarded-For header", () => {
      const headers = new Headers({
        "X-Forwarded-For": "192.168.1.100, 10.0.0.1",
      });
      const request = {
        headers,
        ip: "127.0.0.1",
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("192.168.1.100"); // First IP in X-Forwarded-For
    });

    it("should extract IP from X-Real-IP header", () => {
      const headers = new Headers({
        "X-Real-IP": "192.168.1.200",
      });
      const request = {
        headers,
        ip: "127.0.0.1",
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("192.168.1.200");
    });

    it("should prefer X-Real-IP over X-Forwarded-For", () => {
      const headers = new Headers({
        "X-Forwarded-For": "192.168.1.100",
        "X-Real-IP": "192.168.1.200",
      });
      const request = {
        headers,
        ip: "127.0.0.1",
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("192.168.1.200"); // X-Real-IP takes precedence
    });

    it("should fallback to request IP when headers missing", () => {
      const headers = new Headers({});
      const request = {
        headers,
        ip: "192.168.1.300",
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("192.168.1.300");
    });

    it("should handle missing IP gracefully", () => {
      const headers = new Headers({});
      const request = {
        headers,
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("unknown");
    });

    it("should handle NextRequest headers correctly", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.100",
      });
      const request = {
        headers: {
          get: (name: string) => headers.get(name),
        },
        ip: "127.0.0.1",
      } as any;

      const ip = extractIpAddress(request);
      expect(ip).toBe("192.168.1.100");
    });
  });
});

