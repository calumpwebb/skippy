import { describe, test, expect } from 'vitest';
import {
  SearchArcsParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-arcs';

describe('SearchArcsParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchArcsParamsSchema.parse({
      query: 'fireball arc',
      limit: 5,
    });

    expect(valid.query).toBe('fireball arc');
    expect(valid.limit).toBe(5);
  });

  test('rejects empty query', () => {
    expect(() => SearchArcsParamsSchema.parse({ query: '' })).toThrow();
  });
});

describe('validateFieldPath (ARCs)', () => {
  test('allows simple field paths', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
    expect(() => validateFieldPath('description')).not.toThrow();
  });

  test('rejects forbidden paths', () => {
    expect(() => validateFieldPath('__proto__')).toThrow('Invalid field path');
    expect(() => validateFieldPath('constructor')).toThrow('Invalid field path');
  });
});

describe('extractFields (ARCs)', () => {
  const sampleArc = {
    id: 'fireball',
    name: 'Fireball',
    description: 'Armored rolling incendiary unit',
    threat_level: 'high',
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleArc, undefined);
    expect(result).toEqual(sampleArc);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleArc, ['name', 'threat_level']);
    expect(result).toEqual({ name: 'Fireball', threat_level: 'high' });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('description');
  });
});
