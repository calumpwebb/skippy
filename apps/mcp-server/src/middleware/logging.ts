import { Logger } from '@skippy/shared';

/** Wraps a tool handler with logging. */
export async function withLogging<T>(
  logger: Logger,
  toolName: string,
  params: unknown,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const toolLogger = logger.child({ tool: toolName });

  toolLogger.info('Tool called', { params });

  try {
    const result = await handler();
    const duration = Math.round(performance.now() - startTime);

    toolLogger.success('Tool completed', { duration });

    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    toolLogger.error('Tool failed', {
      error: (error as Error).message,
      duration,
    });
    throw error;
  }
}
