import { describe, test, expect } from 'vitest';
import { Quest } from '@skippy/shared';
import {
  SearchQuestsParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-quests';
import { validateFields, Schema } from '../../src/utils/schema';

describe('SearchQuestsParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchQuestsParamsSchema.parse({
      query: 'kill arcs',
      limit: 10,
    });

    expect(valid.query).toBe('kill arcs');
    expect(valid.limit).toBe(10);
  });

  test('rejects empty query', () => {
    expect(() => SearchQuestsParamsSchema.parse({ query: '' })).toThrow();
  });
});

describe('validateFieldPath (Quests)', () => {
  test('allows simple field paths', () => {
    expect(() => validateFieldPath('name')).not.toThrow();
    expect(() => validateFieldPath('trader_name')).not.toThrow();
  });

  test('rejects forbidden paths', () => {
    expect(() => validateFieldPath('prototype')).toThrow('Invalid field path');
  });
});

describe('extractFields (Quests)', () => {
  const sampleQuest: Quest = {
    id: 'first-mission',
    name: 'First Mission',
    trader_name: 'Quartermaster',
    objectives: ['Kill 5 Pops', 'Extract safely'],
    xp: 500,
    granted_items: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    locations: [],
    marker_category: null,
    image: 'mission.png',
    guide_links: [],
    sort_order: 1,
    position: { x: 100, y: 200 },
    required_items: [],
    rewards: [],
  };

  test('returns full item when no fields specified', () => {
    const result = extractFields(sampleQuest, undefined);
    expect(result).toEqual(sampleQuest);
  });

  test('extracts only requested fields', () => {
    const result = extractFields(sampleQuest, ['name', 'trader_name']);
    expect(result).toEqual({ name: 'First Mission', trader_name: 'Quartermaster' });
  });

  test('extracts nested fields', () => {
    const result = extractFields(sampleQuest, ['position.x']);
    expect(result).toEqual({ 'position.x': 100 });
  });
});

describe('field validation', () => {
  const mockSchema: Schema = {
    fields: [
      'id',
      'name',
      'trader_name',
      'objectives',
      'xp',
      'rewards',
      'position.x',
      'position.y',
    ],
  };

  test('validateFields accepts valid fields', () => {
    expect(() => validateFields(mockSchema, ['name', 'trader_name'])).not.toThrow();
  });

  test('validateFields accepts nested field paths', () => {
    expect(() => validateFields(mockSchema, ['position.x'])).not.toThrow();
  });

  test('validateFields rejects invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['invalid_quest_field'])).toThrow(
      'Invalid field: invalid_quest_field'
    );
  });

  test('validateFields rejects partially invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['name', 'invalid'])).toThrow('Invalid field: invalid');
  });
});
