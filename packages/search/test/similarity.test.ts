import { describe, test, expect } from 'vitest';
import { dotProduct, magnitude, cosineSimilarity, normalizeVector } from '../src/similarity';

describe('dotProduct', () => {
  test('computes dot product of two vectors', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];

    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(dotProduct(a, b)).toBe(32);
  });

  test('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];

    expect(dotProduct(a, b)).toBe(0);
  });

  test('returns sum of squares for same vector', () => {
    const a = [3, 4];
    // 3*3 + 4*4 = 9 + 16 = 25
    expect(dotProduct(a, a)).toBe(25);
  });

  test('handles empty vectors', () => {
    expect(dotProduct([], [])).toBe(0);
  });

  test('handles negative values', () => {
    const a = [1, -2, 3];
    const b = [-1, 2, -3];
    // 1*-1 + -2*2 + 3*-3 = -1 + -4 + -9 = -14
    expect(dotProduct(a, b)).toBe(-14);
  });
});

describe('magnitude', () => {
  test('computes magnitude of a vector', () => {
    const vec = [3, 4];
    // sqrt(9 + 16) = sqrt(25) = 5
    expect(magnitude(vec)).toBe(5);
  });

  test('returns 0 for zero vector', () => {
    expect(magnitude([0, 0, 0])).toBe(0);
  });

  test('returns 1 for unit vector', () => {
    expect(magnitude([1, 0, 0])).toBe(1);
    expect(magnitude([0, 1, 0])).toBe(1);
  });

  test('handles single element', () => {
    expect(magnitude([5])).toBe(5);
    expect(magnitude([-5])).toBe(5);
  });
});

describe('cosineSimilarity', () => {
  test('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  test('returns 1 for parallel vectors (same direction)', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6]; // 2x of a
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  test('returns -1 for antiparallel vectors (opposite direction)', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  test('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  test('returns 0 if either vector is zero', () => {
    const a = [1, 2, 3];
    const zero = [0, 0, 0];
    expect(cosineSimilarity(a, zero)).toBe(0);
    expect(cosineSimilarity(zero, a)).toBe(0);
  });

  test('handles real embedding-like vectors', () => {
    // Simulating 3D embeddings
    const similar1 = [0.8, 0.5, 0.2];
    const similar2 = [0.75, 0.55, 0.25];
    const different = [-0.5, 0.1, 0.9];

    const simScore = cosineSimilarity(similar1, similar2);
    const diffScore = cosineSimilarity(similar1, different);

    expect(simScore).toBeGreaterThan(0.9); // Very similar
    expect(diffScore).toBeLessThan(0.5); // Less similar
  });
});

describe('normalizeVector', () => {
  test('normalizes vector to unit length', () => {
    const vec = [3, 4]; // magnitude = 5
    const normalized = normalizeVector(vec);

    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);
    expect(magnitude(normalized)).toBeCloseTo(1, 5);
  });

  test('returns zero vector for zero input', () => {
    const zero = [0, 0, 0];
    const normalized = normalizeVector(zero);

    expect(normalized).toEqual([0, 0, 0]);
  });

  test('does not mutate original vector', () => {
    const original = [3, 4];
    const copy = [...original];
    normalizeVector(original);

    expect(original).toEqual(copy);
  });
});
