/**
 * Start Worker Script
 * 
 * Starts the Bull queue worker process.
 * Processes jobs from the queue.
 */

// Load environment variables first
import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(closeQueues: () => Promise<void>): void {
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
    // Dynamic import to ensure env vars are loaded before queue module initialization
    const { startWorkers } = await import("../lib/queue/workers");
    const { sessionQueue, closeQueues } = await import("../lib/queue/index");

    console.log("Starting worker process...");

    // Start workers
    startWorkers();

    // Set up graceful shutdown
    setupGracefulShutdown(closeQueues);

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

