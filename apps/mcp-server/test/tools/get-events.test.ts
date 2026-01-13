import { describe, test, expect } from 'vitest';
import { Event } from '@skippy/shared';
import { GetEventsParamsSchema, GetEventsResult } from '../../src/tools/handlers/get-events';

describe('GetEventsParamsSchema', () => {
  test('accepts empty object', () => {
    const valid = GetEventsParamsSchema.parse({});
    expect(valid).toEqual({});
  });

  test('ignores extra fields', () => {
    const valid = GetEventsParamsSchema.parse({ extra: 'ignored' });
    expect(valid).toEqual({});
  });
});

describe('GetEventsResult interface', () => {
  test('type structure is correct', () => {
    const result: GetEventsResult = {
      events: [
        {
          name: 'Test Event',
          map: 'test-map',
          icon: 'test-icon.png',
          startTime: 1640995200,
          endTime: 1641081600,
        },
      ],
      cachedAt: '2024-01-01T00:00:00.000Z',
    };

    expect(result.events).toHaveLength(1);
    expect(result.cachedAt).toBeDefined();
    expect(result.events[0]).toHaveProperty('name');
    expect(result.events[0]).toHaveProperty('map');
    expect(result.events[0]).toHaveProperty('icon');
    expect(result.events[0]).toHaveProperty('startTime');
    expect(result.events[0]).toHaveProperty('endTime');
  });

  test('empty events array is valid', () => {
    const result: GetEventsResult = {
      events: [],
      cachedAt: new Date().toISOString(),
    };

    expect(result.events).toHaveLength(0);
  });

  test('events array contains valid Event objects', () => {
    const sampleEvent: Event = {
      name: 'Sample Event',
      map: 'sample-map',
      icon: 'sample-icon.png',
      startTime: 1640995200,
      endTime: 1641081600,
    };

    const result: GetEventsResult = {
      events: [sampleEvent],
      cachedAt: new Date().toISOString(),
    };

    expect(result.events[0]).toEqual(sampleEvent);
    expect(typeof result.events[0].startTime).toBe('number');
    expect(typeof result.events[0].endTime).toBe('number');
  });
});
