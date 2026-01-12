import { describe, test, expect } from 'vitest';
import { BaseSearchParamsSchema, BaseSearchResultSchema } from '../../src/tools/base';
import { z } from 'zod';

describe('BaseSearchParamsSchema', () => {
  test('validates query as required string', () => {
    expect(() => BaseSearchParamsSchema.parse({})).toThrow();
    expect(() => BaseSearchParamsSchema.parse({ query: '' })).toThrow();

    const valid = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(valid.query).toBe('test');
  });

  test('fields is optional string array', () => {
    const withFields = BaseSearchParamsSchema.parse({
      query: 'test',
      fields: ['name', 'value'],
    });
    expect(withFields.fields).toEqual(['name', 'value']);

    const withoutFields = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(withoutFields.fields).toBeUndefined();
  });

  test('limit defaults to 5, max 20', () => {
    const defaultLimit = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(defaultLimit.limit).toBe(5);

    const customLimit = BaseSearchParamsSchema.parse({ query: 'test', limit: 10 });
    expect(customLimit.limit).toBe(10);

    expect(() => BaseSearchParamsSchema.parse({ query: 'test', limit: 25 })).toThrow();
  });

  test('query has max length of 500', () => {
    const longQuery = 'a'.repeat(501);
    expect(() => BaseSearchParamsSchema.parse({ query: longQuery })).toThrow();

    const validQuery = 'a'.repeat(500);
    const result = BaseSearchParamsSchema.parse({ query: validQuery });
    expect(result.query.length).toBe(500);
  });
});

describe('BaseSearchResultSchema', () => {
  test('creates result schema with item type', () => {
    const ItemSchema = z.object({ id: z.string(), name: z.string() });
    const ResultSchema = BaseSearchResultSchema(ItemSchema);

    const valid = ResultSchema.parse({
      results: [{ id: '1', name: 'Test' }],
      totalMatches: 1,
      query: 'test',
    });

    expect(valid.results).toHaveLength(1);
    expect(valid.totalMatches).toBe(1);
  });

  test('validates empty results array', () => {
    const ItemSchema = z.object({ id: z.string() });
    const ResultSchema = BaseSearchResultSchema(ItemSchema);

    const valid = ResultSchema.parse({
      results: [],
      totalMatches: 0,
      query: 'nothing',
    });

    expect(valid.results).toHaveLength(0);
  });
});
