import { describe, test, expect } from 'vitest';
import { z } from 'zod';
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

describe('Zod schema validation', () => {
  test('throws ZodError for invalid data shape', () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const invalidData = [{ id: 123, name: 'test' }]; // id should be string

    expect(() => z.array(ItemSchema).parse(invalidData)).toThrow();
  });

  test('parses valid data successfully', () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const validData = [{ id: '1', name: 'test' }];
    const result = z.array(ItemSchema).parse(validData);

    expect(result).toEqual(validData);
  });

  test('validates array of objects', () => {
    const EventSchema = z.object({
      name: z.string(),
      startTime: z.number(),
    });
    const validEvents = [
      { name: 'Event 1', startTime: 1000 },
      { name: 'Event 2', startTime: 2000 },
    ];

    const result = z.array(EventSchema).parse(validEvents);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(validEvents[0]);
  });
});
