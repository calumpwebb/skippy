import { describe, test, expect } from 'vitest';
import { inferZodType, OBJECT_MARKER, OBJECT_ARRAY_MARKER } from '../src/generate-zod-schemas';

describe('inferZodType', () => {
  test('infers string type', () => {
    expect(inferZodType('hello')).toBe('z.string()');
  });

  test('infers number type', () => {
    expect(inferZodType(42)).toBe('z.number()');
    expect(inferZodType(3.14)).toBe('z.number()');
  });

  test('infers boolean type', () => {
    expect(inferZodType(true)).toBe('z.boolean()');
    expect(inferZodType(false)).toBe('z.boolean()');
  });

  test('infers null type', () => {
    expect(inferZodType(null)).toBe('z.null()');
  });

  test('infers primitive array types', () => {
    expect(inferZodType(['a', 'b'])).toBe('z.array(z.string())');
    expect(inferZodType([1, 2, 3])).toBe('z.array(z.number())');
    expect(inferZodType([true, false])).toBe('z.array(z.boolean())');
  });

  test('returns z.unknown() for empty array', () => {
    expect(inferZodType([])).toBe('z.array(z.unknown())');
  });

  test('returns object marker for objects', () => {
    expect(inferZodType({ key: 'value' })).toBe(OBJECT_MARKER);
  });

  test('returns object array marker for array of objects', () => {
    expect(inferZodType([{ id: 1 }])).toBe(OBJECT_ARRAY_MARKER);
  });
});
