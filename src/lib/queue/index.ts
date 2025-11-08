/**
 * Queue Infrastructure
 * 
 * Bull queue configuration and initialization.
 * Handles Redis connection and queue setup.
 */

import Queue, { type Queue as QueueType } from "bull";
import Redis, { type RedisOptions } from "ioredis";

/**
 * Redis connection configuration
 */
function getRedisConfig(): RedisOptions {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  // Parse Redis URL (supports both Redis and Upstash formats)
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379"),
      password: url.password || undefined,
      // Upstash-specific options
      tls: url.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };
  } catch (error) {
    // If URL parsing fails, try direct connection string
    return {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };
  }
}

/**
 * Create Redis connection
 */
export function createRedisConnection(): Redis {
  const config = getRedisConfig();
  return new Redis(config);
}

/**
 * Queue options for Bull
 */
const queueOptions = {
  redis: getRedisConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
};

/**
 * Main processing queue
 * Handles session processing jobs with priority support
 */
export const sessionQueue = new Queue("session-processing", queueOptions);

/**
 * High-priority queue for critical jobs (first sessions, critical flags)
 */
export const highPriorityQueue = new Queue("high-priority", {
  ...queueOptions,
  defaultJobOptions: {
    ...queueOptions.defaultJobOptions,
    priority: 1, // Higher priority
  },
});

/**
 * Normal-priority queue for regular jobs
 */
export const normalPriorityQueue = new Queue("normal-priority", {
  ...queueOptions,
  defaultJobOptions: {
    ...queueOptions.defaultJobOptions,
    priority: 5, // Normal priority
  },
});

/**
 * Low-priority queue for batch jobs (analytics, trends)
 */
export const lowPriorityQueue = new Queue("low-priority", {
  ...queueOptions,
  defaultJobOptions: {
    ...queueOptions.defaultJobOptions,
    priority: 10, // Lower priority
  },
});

/**
 * Get appropriate queue based on priority
 */
export function getQueue(priority: "high" | "normal" | "low" = "normal"): QueueType<any> {
  switch (priority) {
    case "high":
      return highPriorityQueue;
    case "low":
      return lowPriorityQueue;
    default:
      return normalPriorityQueue;
  }
}

/**
 * Close all queues gracefully
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    sessionQueue.close(),
    highPriorityQueue.close(),
    normalPriorityQueue.close(),
    lowPriorityQueue.close(),
  ]);
}

