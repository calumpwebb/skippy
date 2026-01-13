import { describe, test, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSchema, validateFields, Schema } from '../../src/utils/schema';
import { Endpoint } from '@skippy/shared';

const fixturesDir = resolve(import.meta.dirname, '../fixtures');

describe('loadSchema', () => {
  test('loads schema from JSON file', async () => {
    const schema = await loadSchema(fixturesDir, Endpoint.ITEMS);

    expect(schema).toHaveProperty('fields');
    expect(Array.isArray(schema.fields)).toBe(true);
  });

  test('throws error for non-existent endpoint', async () => {
    await expect(loadSchema(fixturesDir, 'nonexistent' as Endpoint)).rejects.toThrow();
  });
});

describe('validateFields', () => {
  const schema: Schema = {
    fields: ['id', 'name', 'description', 'stat_block.damage', 'stat_block.health'],
  };

  test('accepts valid field paths', () => {
    expect(() => validateFields(schema, ['id', 'name'])).not.toThrow();
  });

  test('accepts nested field paths', () => {
    expect(() => validateFields(schema, ['stat_block.damage'])).not.toThrow();
  });

  test('accepts empty field array', () => {
    expect(() => validateFields(schema, [])).not.toThrow();
  });

  test('rejects invalid field paths', () => {
    expect(() => validateFields(schema, ['invalid_field'])).toThrow('Invalid field: invalid_field');
  });

  test('rejects partially invalid field paths', () => {
    expect(() => validateFields(schema, ['id', 'invalid'])).toThrow('Invalid field: invalid');
  });

  test('rejects nested invalid field paths', () => {
    expect(() => validateFields(schema, ['stat_block.invalid'])).toThrow(
      'Invalid field: stat_block.invalid'
    );
  });
});
