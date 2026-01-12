import { describe, test, expect } from 'vitest';
import {
  SearchItemsParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-items';

describe('SearchItemsParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchItemsParamsSchema.parse({
      query: 'test item',
      limit: 5,
    });

    expect(valid.query).toBe('test item');
    expect(valid.limit).toBe(5);
  });

  test('rejects empty query', () => {
    expect(() => SearchItemsParamsSchema.parse({ query: '' })).toThrow();
  });

  test('accepts optional fields array', () => {
    const withFields = SearchItemsParamsSchema.parse({
      query: 'test',
      fields: ['name', 'description'],
    });
    expect(withFields.fields).toEqual(['name', 'description']);
  });
});

describe('validateFieldPath', () => {
  test('allows simple field paths', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
    expect(() => validateFieldPath('stat_block')).not.toThrow();
  });

  test('allows nested field paths up to depth 4', () => {
    expect(() => validateFieldPath('a.b.c.d')).not.toThrow();
  });

  test('rejects paths deeper than 4 levels', () => {
    expect(() => validateFieldPath('a.b.c.d.e')).toThrow('Field path too deep');
  });

  test('rejects forbidden paths', () => {
    expect(() => validateFieldPath('__proto__')).toThrow('Invalid field path');
    expect(() => validateFieldPath('constructor')).toThrow('Invalid field path');
    expect(() => validateFieldPath('prototype')).toThrow('Invalid field path');
    expect(() => validateFieldPath('obj.__proto__')).toThrow('Invalid field path');
  });
});

describe('extractFields', () => {
  const sampleItem = {
    id: 'test-item',
    name: 'Test Item',
    description: 'A test item for testing',
    value: 100,
    nested: {
      prop: 'nested value',
      deep: { value: 42 },
    },
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleItem, undefined);
    expect(result).toEqual(sampleItem);
  });

  test('returns full item when fields is empty array', () => {
    const result = extractFields(sampleItem, []);
    expect(result).toEqual(sampleItem);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleItem, ['name', 'value']);
    expect(result).toEqual({ name: 'Test Item', value: 100 });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('description');
  });

  test('extracts nested fields using dot notation', () => {
    const result = extractFields(sampleItem, ['nested.prop']);
    expect(result).toEqual({ 'nested.prop': 'nested value' });
  });

  test('extracts deeply nested fields', () => {
    const result = extractFields(sampleItem, ['nested.deep.value']);
    expect(result).toEqual({ 'nested.deep.value': 42 });
  });

  test('omits fields that do not exist', () => {
    const result = extractFields(sampleItem, ['name', 'nonexistent']);
    expect(result).toEqual({ name: 'Test Item' });
    expect(result).not.toHaveProperty('nonexistent');
  });
});
