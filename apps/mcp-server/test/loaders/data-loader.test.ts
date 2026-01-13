import { describe, test, expect } from 'vitest';
import { Config, Logger, Endpoint } from '@skippy/shared';

// Will be implemented - expect this to fail in TDD red phase
import { loadAllData, LoadedData, SearchEndpoint } from '../../src/loaders/data-loader';

describe('loadAllData', () => {
  const config = new Config({ LOG_LEVEL: 'error' });
  const logger = new Logger(config);

  test('throws error when data directory does not exist', async () => {
    const nonExistentDir = '/tmp/skippy-test-nonexistent-' + Date.now();

    await expect(loadAllData(nonExistentDir, config, logger)).rejects.toThrow(
      /not found|does not exist/i
    );
  });

  test('throws error when data.json is missing for an endpoint', async () => {
    // Empty temp directory - will have no data files
    const emptyDir = '/tmp/skippy-test-empty-' + Date.now();
    await Bun.write(emptyDir + '/.keep', '');

    await expect(loadAllData(emptyDir, config, logger)).rejects.toThrow();
  });

  test('SEARCH_ENDPOINTS excludes EVENTS (events not searchable)', () => {
    expect(SearchEndpoint).not.toContain(Endpoint.EVENTS);
    expect(SearchEndpoint).toContain(Endpoint.ITEMS);
    expect(SearchEndpoint).toContain(Endpoint.ARCS);
    expect(SearchEndpoint).toContain(Endpoint.QUESTS);
    expect(SearchEndpoint).toContain(Endpoint.TRADERS);
  });
});

describe('LoadedData type', () => {
  test('interface has correct shape', () => {
    // Type-level test - if this compiles, the interface is correct
    const mockData: LoadedData = {
      searchers: {} as LoadedData['searchers'],
      schemas: {} as LoadedData['schemas'],
      events: [],
    };

    expect(mockData).toHaveProperty('searchers');
    expect(mockData).toHaveProperty('schemas');
    expect(mockData).toHaveProperty('events');
  });
});
