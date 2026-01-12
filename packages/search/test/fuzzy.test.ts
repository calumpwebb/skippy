import { describe, test, expect } from 'vitest';
import { FuzzySearcher } from '../src/fuzzy';

describe('FuzzySearcher', () => {
  const items = [
    { id: '1', name: 'Blue Light Stick', description: 'A glowing blue stick' },
    { id: '2', name: 'Green Light Stick', description: 'A glowing green stick' },
    { id: '3', name: 'Red Light Stick', description: 'A glowing red stick' },
    { id: '4', name: 'Medkit', description: 'Heals the user' },
    { id: '5', name: 'Bandage', description: 'Minor healing item' },
  ];

  test('finds exact name matches', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('Blue Light Stick');

    // Fuzzy search may return similar matches, but best match should be first
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].item.name).toBe('Blue Light Stick');
    expect(results[0].score).toBeCloseTo(1, 1); // Near-perfect match
  });

  test('finds partial matches', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('Light Stick');

    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.map(r => r.item.name)).toContain('Blue Light Stick');
  });

  test('handles typos with fuzzy matching', () => {
    const searcher = new FuzzySearcher(items, ['name'], { threshold: 0.4 });

    const results = searcher.search('Blu Ligt Stik');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe('Blue Light Stick');
  });

  test('searches across multiple fields', () => {
    const searcher = new FuzzySearcher(items, ['name', 'description']);

    const results = searcher.search('healing');

    // Should find Bandage (has "healing" in description)
    expect(results.length).toBeGreaterThanOrEqual(1);
    const names = results.map(r => r.item.name);
    expect(names).toContain('Bandage');
  });

  test('finds matches in description field', () => {
    const searcher = new FuzzySearcher(items, ['name', 'description']);

    const results = searcher.search('heals');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].item.name).toBe('Medkit');
  });

  test('returns results with scores', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('Blue Light Stick');

    expect(results[0]).toHaveProperty('score');
    expect(typeof results[0].score).toBe('number');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].score).toBeLessThanOrEqual(1);
  });

  test('respects limit parameter', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('Light', 2);

    expect(results).toHaveLength(2);
  });

  test('returns empty array for no matches', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('xyznonexistent123');

    expect(results).toEqual([]);
  });

  test('results are sorted by score (best first)', () => {
    const searcher = new FuzzySearcher(items, ['name']);

    const results = searcher.search('Blue Light');

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
