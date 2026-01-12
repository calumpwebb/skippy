import { describe, test, expect } from 'vitest';
import {
  SearchQuestsParamsSchema,
  extractFields,
  validateFieldPath,
} from '../../src/tools/handlers/search-quests';

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
  const sampleQuest = {
    id: 'first-mission',
    name: 'First Mission',
    trader_name: 'Quartermaster',
    objectives: ['Kill 5 Pops', 'Extract safely'],
    rewards: { xp: 500, credits: 1000 },
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
    const result = extractFields(sampleQuest, ['rewards.xp']);
    expect(result).toEqual({ 'rewards.xp': 500 });
  });
});
