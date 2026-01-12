import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerCleanup, setupGracefulShutdown, clearCleanupHandlers } from '../src/shutdown';
import { Logger } from '../src/logger';
import { Config } from '../src/config';

describe('shutdown', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    mockLogger = new Logger(config, { component: 'test' });
    clearCleanupHandlers();
  });

  afterEach(() => {
    clearCleanupHandlers();
  });

  test('registerCleanup adds cleanup function', () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    expect(() => registerCleanup(cleanup)).not.toThrow();
  });

  test('setupGracefulShutdown registers signal handlers', () => {
    const onSpy = vi.spyOn(process, 'on');

    setupGracefulShutdown(mockLogger);

    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    onSpy.mockRestore();
  });

  test('clearCleanupHandlers clears all handlers', () => {
    const cleanup1 = vi.fn().mockResolvedValue(undefined);
    const cleanup2 = vi.fn().mockResolvedValue(undefined);
    registerCleanup(cleanup1);
    registerCleanup(cleanup2);

    // Should not throw
    expect(() => clearCleanupHandlers()).not.toThrow();
  });
});
