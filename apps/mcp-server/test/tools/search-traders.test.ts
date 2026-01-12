import { describe, test, expect } from 'vitest';
import {
  SearchTradersParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-traders';

describe('SearchTradersParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchTradersParamsSchema.parse({
      query: 'weapons trader',
      limit: 3,
    });

    expect(valid.query).toBe('weapons trader');
    expect(valid.limit).toBe(3);
  });

  test('rejects empty query', () => {
    expect(() => SearchTradersParamsSchema.parse({ query: '' })).toThrow();
  });
});

describe('validateFieldPath (Traders)', () => {
  test('allows simple field paths', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
    expect(() => validateFieldPath('inventory')).not.toThrow();
  });

  test('rejects forbidden paths', () => {
    expect(() => validateFieldPath('__proto__')).toThrow('Invalid field path');
  });
});

describe('extractFields (Traders)', () => {
  const sampleTrader = {
    id: 'weapons-dealer',
    name: 'Weapons Dealer',
    description: 'Sells guns and ammo',
    inventory: [{ id: 'rifle', quantity: 5 }],
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleTrader, undefined);
    expect(result).toEqual(sampleTrader);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleTrader, ['name']);
    expect(result).toEqual({ name: 'Weapons Dealer' });
  });
});
