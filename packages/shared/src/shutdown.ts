import { Logger } from './logger';

type CleanupFn = () => Promise<void>;
const cleanupHandlers: CleanupFn[] = [];

/** Register a cleanup function to run on shutdown. */
export function registerCleanup(fn: CleanupFn): void {
  cleanupHandlers.push(fn);
}

/** Clear all registered cleanup handlers (useful for testing). */
export function clearCleanupHandlers(): void {
  cleanupHandlers.length = 0;
}

/** Set up graceful shutdown handlers for SIGTERM and SIGINT. */
export function setupGracefulShutdown(logger: Logger): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    for (const cleanup of cleanupHandlers) {
      try {
        await cleanup();
      } catch (error) {
        logger.error('Cleanup failed', { error: (error as Error).message });
      }
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}