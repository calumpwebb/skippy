const EPSILON = 1e-10;

/** Computes dot product of two vectors. */
export function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** Computes the magnitude (length) of a vector. */
export function magnitude(vec: number[]): number {
  let sum = 0;
  for (const val of vec) {
    sum += val * val;
  }
  return Math.sqrt(sum);
}

/** Computes cosine similarity between two vectors (-1 to 1). */
export function cosineSimilarity(a: number[], b: number[]): number {
  // Validate vector lengths match
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  const magA = magnitude(a);
  const magB = magnitude(b);

  // Guard against near-zero magnitudes
  if (magA < EPSILON || magB < EPSILON) {
    return 0;
  }

  const result = dotProduct(a, b) / (magA * magB);

  // Guard against NaN from floating point errors
  return Number.isNaN(result) ? 0 : result;
}

/** Normalizes a vector to unit length. */
export function normalizeVector(vec: number[]): number[] {
  const mag = magnitude(vec);

  if (mag === 0) {
    return vec.slice(); // Return copy of zero vector
  }

  return vec.map(val => val / mag);
}
