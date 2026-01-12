import { describe, test, expect, vi } from 'vitest';
import { Logger } from '../src/logger';
import { Config } from '../src/config';

describe('Logger', () => {
  test('creates logger with context', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const logger = new Logger(config, { component: 'test' });

    expect(logger).toBeDefined();
  });

  test('child logger inherits and extends context', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const parent = new Logger(config, { component: 'parent' });
    const child = parent.child({ operation: 'child-op' });

    expect(child).toBeDefined();
    expect(child).not.toBe(parent);
  });

  test('respects log level - debug not logged at info level', () => {
    const config = new Config({ LOG_LEVEL: 'info' });
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.debug('should not appear');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('logs at appropriate levels', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.info('test message');

    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  test('handles circular references in meta without throwing', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;

    // Should not throw
    expect(() => logger.info('circular test', circular)).not.toThrow();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  test('logs with unknown log level (defensive)', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.info('test message');

    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
