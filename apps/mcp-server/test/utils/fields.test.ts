import { describe, it, expect } from 'bun:test';
import { getNestedValue, extractFields, validateFieldPath } from '../../src/utils/fields';

describe('validateFieldPath', () => {
  it('accepts valid single-level path', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
  });

  it('accepts valid nested path', () => {
    expect(() => validateFieldPath('stats.weight')).not.toThrow();
  });

  it('accepts path at max depth', () => {
    expect(() => validateFieldPath('a.b.c.d')).not.toThrow();
  });

  it('throws on path exceeding max depth', () => {
    expect(() => validateFieldPath('a.b.c.d.e')).toThrow('Field path too deep');
  });

  it('throws on __proto__ path', () => {
    expect(() => validateFieldPath('__proto__')).toThrow('Invalid field path');
  });

  it('throws on constructor path', () => {
    expect(() => validateFieldPath('constructor')).toThrow('Invalid field path');
  });

  it('throws on prototype path', () => {
    expect(() => validateFieldPath('prototype')).toThrow('Invalid field path');
  });

  it('throws on forbidden path in nested position', () => {
    expect(() => validateFieldPath('foo.__proto__.bar')).toThrow('Invalid field path');
  });

  it('is case insensitive for forbidden paths', () => {
    expect(() => validateFieldPath('__PROTO__')).toThrow('Invalid field path');
    expect(() => validateFieldPath('Constructor')).toThrow('Invalid field path');
  });
});

describe('getNestedValue', () => {
  const obj = {
    id: '123',
    name: 'Test Item',
    stats: {
      weight: 0.5,
      damage: { min: 10, max: 20 },
    },
    tags: ['weapon', 'rare'],
    nullValue: null,
  };

  it('returns top-level value', () => {
    expect(getNestedValue(obj, 'name')).toBe('Test Item');
  });

  it('returns nested value one level deep', () => {
    expect(getNestedValue(obj, 'stats.weight')).toBe(0.5);
  });

  it('returns nested value two levels deep', () => {
    expect(getNestedValue(obj, 'stats.damage.min')).toBe(10);
  });

  it('returns undefined for non-existent path', () => {
    expect(getNestedValue(obj, 'foo.bar')).toBeUndefined();
  });

  it('returns undefined for path through non-object', () => {
    expect(getNestedValue(obj, 'name.foo')).toBeUndefined();
  });

  it('returns undefined for path through null', () => {
    expect(getNestedValue(obj, 'nullValue.foo')).toBeUndefined();
  });

  it('returns array at path', () => {
    expect(getNestedValue(obj, 'tags')).toEqual(['weapon', 'rare']);
  });

  it('returns null value at path', () => {
    expect(getNestedValue(obj, 'nullValue')).toBeNull();
  });
});

describe('extractFields', () => {
  const obj = {
    id: '123',
    name: 'Test Item',
    stats: { weight: 0.5 },
    description: 'A test item',
  };

  it('returns full object when no fields specified', () => {
    expect(extractFields(obj)).toEqual(obj);
  });

  it('returns full object when empty fields array', () => {
    expect(extractFields(obj, [])).toEqual(obj);
  });

  it('extracts single field', () => {
    expect(extractFields(obj, ['name'])).toEqual({ name: 'Test Item' });
  });

  it('extracts multiple fields', () => {
    expect(extractFields(obj, ['id', 'name'])).toEqual({
      id: '123',
      name: 'Test Item',
    });
  });

  it('extracts nested fields with dot notation key', () => {
    expect(extractFields(obj, ['stats.weight'])).toEqual({
      'stats.weight': 0.5,
    });
  });

  it('omits undefined fields from result', () => {
    expect(extractFields(obj, ['name', 'nonexistent'])).toEqual({
      name: 'Test Item',
    });
  });

  it('throws on invalid field path', () => {
    expect(() => extractFields(obj, ['__proto__'])).toThrow();
    expect(() => extractFields(obj, ['constructor'])).toThrow();
  });

  it('validates all fields before extracting', () => {
    expect(() => extractFields(obj, ['name', '__proto__'])).toThrow();
  });
});
