import { describe, test, expect } from 'vitest';
import { validateDataDir, formatError } from '../src/utils/validate';
import { resolve } from 'node:path';

describe('validateDataDir', () => {
  test('resolves relative paths to absolute', async () => {
    const result = await validateDataDir('./data');
    expect(result).toBe(resolve('./data'));
  });

  test('rejects path traversal with ..', async () => {
    await expect(validateDataDir('../../../etc')).rejects.toThrow('Path traversal not allowed');
  });

  test('rejects path traversal with .. in middle', async () => {
    await expect(validateDataDir('./data/../../../etc')).rejects.toThrow(
      'Path traversal not allowed'
    );
  });

  test('accepts simple relative path', async () => {
    const result = await validateDataDir('./data');
    expect(result).toContain('data');
  });

  test('accepts absolute path', async () => {
    const result = await validateDataDir('/tmp/skippy-test');
    expect(result).toBe('/tmp/skippy-test');
  });
});

describe('formatError', () => {
  test('formats Error instance', () => {
    const error = new Error('Test error');
    expect(formatError(error)).toBe('Test error');
  });

  test('formats string error', () => {
    expect(formatError('String error')).toBe('String error');
  });

  test('formats unknown error', () => {
    expect(formatError({ unknown: true })).toBe('Unknown error');
    expect(formatError(123)).toBe('Unknown error');
    expect(formatError(null)).toBe('Unknown error');
  });
});
