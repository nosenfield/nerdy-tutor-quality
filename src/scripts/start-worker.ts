/**
 * Start Worker Script
 * 
 * Starts the Bull queue worker process.
 * Processes jobs from the queue.
 */

import "dotenv/config";
import { startWorkers } from "@/lib/queue/workers";
import { sessionQueue, closeQueues } from "@/lib/queue/index";

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    
    // Close all queues
    await closeQueues();
    
    console.log("Worker stopped successfully");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("Starting worker process...");

    // Start workers
    startWorkers();

    // Set up graceful shutdown
    setupGracefulShutdown();

    // Log queue status
    sessionQueue.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });

    sessionQueue.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    sessionQueue.on("error", (error) => {
      console.error("Queue error:", error);
    });

    console.log("Worker started and ready to process jobs");
    console.log("Press Ctrl+C to stop");

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error("Error starting worker:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

