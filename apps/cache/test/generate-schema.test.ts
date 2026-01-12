import { describe, test, expect } from 'vitest';
import { generateSchema, extractFieldPaths } from '../src/generate-schema';

describe('extractFieldPaths', () => {
  test('extracts top-level fields', () => {
    const obj = { name: 'Test', value: 100 };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('name');
    expect(paths).toContain('value');
  });

  test('extracts nested field paths with dot notation', () => {
    const obj = {
      name: 'Test',
      stat_block: {
        damage: 50,
        healing: 0,
      },
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('name');
    expect(paths).toContain('stat_block');
    expect(paths).toContain('stat_block.damage');
    expect(paths).toContain('stat_block.healing');
  });

  test('handles deeply nested objects', () => {
    const obj = {
      level1: {
        level2: {
          level3: 'deep',
        },
      },
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('level1');
    expect(paths).toContain('level1.level2');
    expect(paths).toContain('level1.level2.level3');
  });

  test('handles arrays by extracting element fields', () => {
    const obj = {
      items: [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ],
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('items');
    expect(paths).toContain('items.id');
    expect(paths).toContain('items.name');
  });

  test('returns empty array for null input', () => {
    const paths = extractFieldPaths(null);
    expect(paths).toEqual([]);
  });

  test('returns empty array for primitive input', () => {
    const paths = extractFieldPaths('string');
    expect(paths).toEqual([]);
  });

  test('stops at MAX_DEPTH to prevent infinite recursion', () => {
    // Create deeply nested object (12 levels deep)
    let obj: Record<string, unknown> = { value: 'leaf' };
    for (let i = 0; i < 12; i++) {
      obj = { nested: obj };
    }

    const paths = extractFieldPaths(obj);

    // Should stop at depth 10, so we won't see the deepest 'value' field
    expect(paths).toContain('nested');
    expect(paths).not.toContain(
      'nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.value'
    );
  });
});

describe('generateSchema', () => {
  test('generates schema from array of objects', () => {
    const items = [
      { id: '1', name: 'Item 1', value: 100 },
      { id: '2', name: 'Item 2', value: 200, extra: 'field' },
    ];

    const schema = generateSchema(items);

    expect(schema.fields).toContain('id');
    expect(schema.fields).toContain('name');
    expect(schema.fields).toContain('value');
    expect(schema.fields).toContain('extra'); // Found in second item
  });

  test('returns sorted field list', () => {
    const items = [{ zebra: 1, alpha: 2, middle: 3 }];

    const schema = generateSchema(items);

    expect(schema.fields[0]).toBe('alpha');
    expect(schema.fields[1]).toBe('middle');
    expect(schema.fields[2]).toBe('zebra');
  });

  test('deduplicates fields across items', () => {
    const items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];

    const schema = generateSchema(items);

    expect(schema.fields.filter(f => f === 'name')).toHaveLength(1);
  });

  test('returns empty fields for empty array', () => {
    const schema = generateSchema([]);
    expect(schema.fields).toEqual([]);
  });
});
