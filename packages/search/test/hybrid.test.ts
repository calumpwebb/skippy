import { describe, test, expect } from 'vitest';
import { mergeResults, HybridSearcher, BOOST_FACTOR } from '../src/hybrid';

describe('BOOST_FACTOR', () => {
  test('is set to 1.5', () => {
    expect(BOOST_FACTOR).toBe(1.5);
  });
});

describe('mergeResults', () => {
  test('merges semantic and fuzzy results', () => {
    const semantic = [
      { id: '1', score: 0.8 },
      { id: '2', score: 0.6 },
    ];
    const fuzzy = [{ id: '3', score: 0.7 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(3);
  });

  test('boosts items found in both result sets', () => {
    const semantic = [{ id: '1', score: 0.8 }];
    const fuzzy = [{ id: '1', score: 0.9 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(1);
    // Score is clamped to max 1.0 after boosting
    expect(merged[0].score).toBe(1.0);
  });

  test('boosts items with lower scores correctly', () => {
    const semantic = [{ id: '1', score: 0.5 }];
    const fuzzy = [{ id: '1', score: 0.6 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBeCloseTo(0.5 * BOOST_FACTOR, 5);
  });

  test('deduplicates by id', () => {
    const semantic = [
      { id: '1', score: 0.8 },
      { id: '2', score: 0.6 },
    ];
    const fuzzy = [
      { id: '1', score: 0.7 },
      { id: '2', score: 0.5 },
    ];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(2);
  });

  test('sorts by score descending', () => {
    const semantic = [{ id: '2', score: 0.5 }];
    const fuzzy = [{ id: '1', score: 0.9 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged[0].id).toBe('1');
    expect(merged[1].id).toBe('2');
  });

  test('handles empty semantic results', () => {
    const semantic: { id: string; score: number }[] = [];
    const fuzzy = [{ id: '1', score: 0.9 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(1);
  });

  test('handles empty fuzzy results', () => {
    const semantic = [{ id: '1', score: 0.8 }];
    const fuzzy: { id: string; score: number }[] = [];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(0.8); // No boost
  });

  test('respects limit parameter', () => {
    const semantic = [
      { id: '1', score: 0.9 },
      { id: '2', score: 0.8 },
      { id: '3', score: 0.7 },
    ];
    const fuzzy: { id: string; score: number }[] = [];

    const merged = mergeResults(semantic, fuzzy, 2);

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('1');
    expect(merged[1].id).toBe('2');
  });
});

describe('HybridSearcher', () => {
  test('exports HybridSearcher class', () => {
    expect(HybridSearcher).toBeDefined();
  });
});
