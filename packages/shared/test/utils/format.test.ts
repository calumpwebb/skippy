import { describe, test, expect } from 'vitest';
import { formatBytes } from '../../src/utils/format';

describe('formatBytes', () => {
  test('formats bytes (< 1KB)', () => {
    expect(formatBytes(0)).toBe('0B');
    expect(formatBytes(1)).toBe('1B');
    expect(formatBytes(512)).toBe('512B');
    expect(formatBytes(1023)).toBe('1023B');
  });

  test('formats kilobytes (1KB - 1MB)', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
    expect(formatBytes(1536)).toBe('1.5KB');
    expect(formatBytes(10240)).toBe('10.0KB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0KB');
  });

  test('formats megabytes (>= 1MB)', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0MB');
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5MB');
    expect(formatBytes(1024 * 1024 * 100)).toBe('100.0MB');
  });
});
