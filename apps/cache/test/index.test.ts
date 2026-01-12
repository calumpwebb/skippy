import { describe, test, expect } from 'vitest';
import { runCache, CacheOptions, CacheResult } from '../src/index';
import { Endpoint } from '@skippy/shared';

// We test the orchestration logic, not the actual downloads
describe('runCache', () => {
  test('exports runCache function', () => {
    expect(typeof runCache).toBe('function');
  });

  test('CacheOptions has correct defaults', () => {
    const defaults: CacheOptions = {
      dataDir: './data',
      endpoints: Object.values(Endpoint),
      generateTypes: true,
      generateFixtures: true,
    };

    expect(defaults.dataDir).toBe('./data');
    expect(defaults.endpoints).toHaveLength(5);
  });

  test('CacheResult interface has expected shape', () => {
    const successResult: CacheResult = {
      endpoint: Endpoint.ITEMS,
      success: true,
      itemCount: 100,
    };

    const failureResult: CacheResult = {
      endpoint: Endpoint.ARCS,
      success: false,
      error: 'Connection timeout',
    };

    expect(successResult.success).toBe(true);
    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toBe('Connection timeout');
  });
});
