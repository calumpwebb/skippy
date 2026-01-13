import { describe, test, expect } from 'vitest';
import { Trader } from '@skippy/shared';
import { SearchTradersParamsSchema } from '../../src/tools/handlers/search-traders';
import { extractFields, validateFieldPath } from '../../src/utils/fields';
import { validateFields, Schema } from '../../src/utils/schema';

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
  const sampleTrader: Trader = {
    name: 'Weapons Dealer',
    items: [
      {
        id: 'rifle',
        icon: 'rifle.png',
        name: 'Rifle',
        value: 100,
        rarity: 'common',
        item_type: 'weapon',
        description: 'A rifle',
        trader_price: 50,
      },
    ],
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleTrader as unknown as Record<string, unknown>, undefined);
    expect(result).toEqual(sampleTrader);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleTrader as unknown as Record<string, unknown>, ['name']);
    expect(result).toEqual({ name: 'Weapons Dealer' });
  });
});

describe('field validation', () => {
  const mockSchema: Schema = {
    fields: ['name', 'items', 'inventory', 'inventory.weapons'],
  };

  test('validateFields accepts valid fields', () => {
    expect(() => validateFields(mockSchema, ['name', 'items'])).not.toThrow();
  });

  test('validateFields accepts nested field paths', () => {
    expect(() => validateFields(mockSchema, ['inventory.weapons'])).not.toThrow();
  });

  test('validateFields rejects invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['invalid_trader_field'])).toThrow(
      'Invalid field: invalid_trader_field'
    );
  });

  test('validateFields rejects partially invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['name', 'invalid'])).toThrow('Invalid field: invalid');
  });
});
