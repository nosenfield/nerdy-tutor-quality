/**
 * Queue Monitoring Setup
 * 
 * Bull Board configuration for monitoring queue status and jobs.
 * Provides utilities for viewing queue metrics, job history, and status.
 * 
 * Note: Full Bull Board UI requires custom server setup or can be accessed
 * via programmatic API endpoints for queue status.
 */

import type { Queue } from "bull";
import {
  sessionQueue,
  highPriorityQueue,
  normalPriorityQueue,
  lowPriorityQueue,
} from "./index";

/**
 * Create Bull Board server adapter
 * 
 * Sets up Bull Board with all queues for monitoring.
 * Returns Express router that can be used with custom server setup.
 * 
 * For Next.js App Router, use the status API endpoints instead.
 * 
 * Note: This function uses lazy imports to avoid bundling Express
 * in Next.js App Router routes that don't need it.
 */
export async function createQueueMonitoring() {
  // Lazy import to avoid bundling Express in Next.js App Router
  const { createBullBoard } = await import("@bull-board/api");
  const { BullAdapter } = await import("@bull-board/api/bullAdapter");
  const { ExpressAdapter } = await import("@bull-board/express");

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/admin/queue");

  createBullBoard({
    queues: [
      new BullAdapter(sessionQueue),
      new BullAdapter(highPriorityQueue),
      new BullAdapter(normalPriorityQueue),
      new BullAdapter(lowPriorityQueue),
    ],
    serverAdapter,
  });

  return serverAdapter;
}

/**
 * Get all queues for monitoring
 * 
 * Returns array of all configured queues.
 */
export function getAllQueues(): Queue[] {
  return [sessionQueue, highPriorityQueue, normalPriorityQueue, lowPriorityQueue];
}

/**
 * Get queue status summary
 * 
 * Returns aggregated status for all queues.
 */
export async function getQueueStatusSummary() {
  const queues = getAllQueues();
  const status = await Promise.all(
    queues.map(async (queue) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name: queue.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    })
  );

  return {
    queues: status,
    summary: {
      totalWaiting: status.reduce((sum, q) => sum + q.waiting, 0),
      totalActive: status.reduce((sum, q) => sum + q.active, 0),
      totalCompleted: status.reduce((sum, q) => sum + q.completed, 0),
      totalFailed: status.reduce((sum, q) => sum + q.failed, 0),
      totalDelayed: status.reduce((sum, q) => sum + q.delayed, 0),
    },
  };
}

