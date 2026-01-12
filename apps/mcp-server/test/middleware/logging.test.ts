import { describe, test, expect, vi, beforeEach } from 'vitest';
import { withLogging } from '../../src/middleware/logging';
import { Config, Logger } from '@skippy/shared';

describe('withLogging', () => {
  let logger: Logger;

  beforeEach(() => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    logger = new Logger(config);
  });

  test('logs tool call start and completion', async () => {
    // Spy on the child method to intercept the created logger
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    const result = await withLogging(logger, 'test_tool', { query: 'test' }, async () => {
      return { result: 'ok' };
    });

    expect(mockChildLogger.info).toHaveBeenCalledWith('Tool called', expect.any(Object));
    expect(mockChildLogger.success).toHaveBeenCalledWith('Tool completed', expect.any(Object));
    expect(result).toEqual({ result: 'ok' });
  });

  test('logs errors and re-throws', async () => {
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    await expect(
      withLogging(logger, 'test_tool', {}, async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    expect(mockChildLogger.error).toHaveBeenCalledWith('Tool failed', expect.any(Object));
  });

  test('includes duration in logs', async () => {
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    await withLogging(logger, 'test_tool', {}, async () => {
      return {};
    });

    expect(mockChildLogger.success).toHaveBeenCalledWith(
      'Tool completed',
      expect.objectContaining({ duration: expect.any(Number) })
    );
  });

  test('includes params in start log', async () => {
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    await withLogging(logger, 'search_items', { query: 'test' }, async () => {
      return {};
    });

    expect(mockChildLogger.info).toHaveBeenCalledWith(
      'Tool called',
      expect.objectContaining({ params: { query: 'test' } })
    );
  });

  test('includes error message in error log', async () => {
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    await expect(
      withLogging(logger, 'test_tool', {}, async () => {
        throw new Error('Specific error message');
      })
    ).rejects.toThrow();

    expect(mockChildLogger.error).toHaveBeenCalledWith(
      'Tool failed',
      expect.objectContaining({ error: 'Specific error message' })
    );
  });

  test('creates child logger with tool name context', async () => {
    const childSpy = vi.spyOn(logger, 'child');
    const mockChildLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    childSpy.mockReturnValue(mockChildLogger as unknown as Logger);

    await withLogging(logger, 'search_items', {}, async () => ({}));

    expect(childSpy).toHaveBeenCalledWith({ tool: 'search_items' });
  });
});
