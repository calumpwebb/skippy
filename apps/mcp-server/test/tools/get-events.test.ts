import { describe, test, expect } from 'vitest';
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
      events: [{ id: 'event-1', name: 'Test Event' }],
      cachedAt: '2024-01-01T00:00:00.000Z',
    };

    expect(result.events).toHaveLength(1);
    expect(result.cachedAt).toBeDefined();
  });

  test('empty events array is valid', () => {
    const result: GetEventsResult = {
      events: [],
      cachedAt: new Date().toISOString(),
    };

    expect(result.events).toHaveLength(0);
  });
});
