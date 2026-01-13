import { describe, test, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSchema, validateFields, Schema } from '../../src/utils/schema';
import { Endpoint } from '@skippy/shared';

const fixturesDir = resolve(import.meta.dirname, '../fixtures');

describe('loadSchema', () => {
  test('extracts field paths from Zod schema', () => {
    const schema = loadSchema(fixturesDir, Endpoint.ITEMS);

    expect(schema).toHaveProperty('fields');
    expect(Array.isArray(schema.fields)).toBe(true);
    expect(schema.fields.length).toBeGreaterThan(0);
    // Check for some expected fields
    expect(schema.fields).toContain('id');
    expect(schema.fields).toContain('name');
  });

  test('extracts nested field paths', () => {
    const schema = loadSchema(fixturesDir, Endpoint.ITEMS);

    // Items have nested stat_block
    expect(schema.fields.some(f => f.startsWith('stat_block.'))).toBe(true);
  });

  test('works for all endpoints', () => {
    const endpoints = [
      Endpoint.ITEMS,
      Endpoint.ARCS,
      Endpoint.QUESTS,
      Endpoint.TRADERS,
      Endpoint.EVENTS,
    ];

    for (const endpoint of endpoints) {
      const schema = loadSchema(fixturesDir, endpoint);
      expect(schema.fields.length).toBeGreaterThan(0);
    }
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
