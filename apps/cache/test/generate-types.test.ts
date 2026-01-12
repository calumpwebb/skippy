import { describe, test, expect } from 'vitest';
import { inferType, generateTypeScript } from '../src/generate-types';

describe('inferType', () => {
  test('infers string type', () => {
    expect(inferType('hello')).toBe('string');
  });

  test('infers number type', () => {
    expect(inferType(42)).toBe('number');
    expect(inferType(3.14)).toBe('number');
  });

  test('infers boolean type', () => {
    expect(inferType(true)).toBe('boolean');
    expect(inferType(false)).toBe('boolean');
  });

  test('infers null type', () => {
    expect(inferType(null)).toBe('null');
  });

  test('infers array type from elements', () => {
    expect(inferType(['a', 'b'])).toBe('string[]');
    expect(inferType([1, 2, 3])).toBe('number[]');
  });

  test('infers object type', () => {
    expect(inferType({ key: 'value' })).toBe('object');
  });

  test('infers unknown for empty array', () => {
    expect(inferType([])).toBe('unknown[]');
  });

  test('infers undefined type', () => {
    expect(inferType(undefined)).toBe('undefined');
  });
});

describe('generateTypeScript', () => {
  test('generates interface with simple fields', () => {
    const items = [{ id: '1', name: 'Test', value: 100 }];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('export interface Item');
    expect(ts).toContain('id: string');
    expect(ts).toContain('name: string');
    expect(ts).toContain('value: number');
  });

  test('generates interface with optional fields', () => {
    const items = [
      { id: '1', name: 'Test' },
      { id: '2', name: 'Test2', extra: 'field' },
    ];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('id: string');
    expect(ts).toContain('extra?: string'); // Optional because not in all items
  });

  test('generates nested interface for objects', () => {
    const items = [
      {
        id: '1',
        stat_block: { damage: 50, healing: 0 },
      },
    ];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('stat_block: ItemStatBlock');
    expect(ts).toContain('export interface ItemStatBlock');
    expect(ts).toContain('damage: number');
  });

  test('handles array fields', () => {
    const items = [{ id: '1', tags: ['tag1', 'tag2'] }];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('tags: string[]');
  });

  test('returns empty string for empty items', () => {
    const ts = generateTypeScript('Item', []);
    expect(ts).toBe('');
  });
});
