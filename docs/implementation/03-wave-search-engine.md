# Wave 3: Search Engine

**Prerequisites:** Wave 2 complete (data downloaded, schemas exist)
**Outputs:** Functional search package with semantic, fuzzy, and hybrid search

---

## Task 3A: Similarity Functions

**Depends on:** Wave 1 complete (shared package)
**Can run parallel with:** 3C (no shared dependencies)
**Files Created:**
- `packages/search/src/similarity.ts`
- `packages/search/test/similarity.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/search/test/similarity.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import {
  dotProduct,
  magnitude,
  cosineSimilarity,
  normalizeVector,
} from '../src/similarity';

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
    expect(diffScore).toBeLessThan(0.5);   // Less similar
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
```

### TDD Step 2: Run tests - verify RED

```bash
cd packages/search
bun test similarity
```

**Expected:** Tests FAIL because `similarity.ts` doesn't exist.

### TDD Step 3: Implement similarity.ts

Create `packages/search/src/similarity.ts`:

```typescript
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
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct(a, b) / (magA * magB);
}

/** Normalizes a vector to unit length. */
export function normalizeVector(vec: number[]): number[] {
  const mag = magnitude(vec);

  if (mag === 0) {
    return vec.slice(); // Return copy of zero vector
  }

  return vec.map(val => val / mag);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test similarity
```

**Expected:** All tests PASS.

### Checkpoint 3A
- [ ] Tests pass: `bun test packages/search`
- [ ] All math functions return correct values
- [ ] Edge cases handled (zero vectors, empty arrays)

---

## Task 3B: Embedding Generator

**Depends on:** 3A complete (needs similarity functions)
**Can run parallel with:** 3C
**Files Created:**
- `packages/search/src/embeddings.ts`
- `packages/search/test/embeddings.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/search/test/embeddings.test.ts`:

```typescript
import { describe, test, expect, vi, beforeAll } from 'vitest';
import {
  Embedder,
  createSearchableText,
  EmbedderConfig,
} from '../src/embeddings';
import { Endpoint } from '@skippy/shared';

describe('createSearchableText', () => {
  test('combines item fields into searchable text', () => {
    const item = {
      name: 'Blue Light Stick',
      description: 'A glowing stick',
      item_type: 'Quick Use',
      rarity: 'Common',
    };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Blue Light Stick');
    expect(text).toContain('A glowing stick');
    expect(text).toContain('Quick Use');
    expect(text).toContain('Common');
  });

  test('handles missing fields gracefully', () => {
    const item = { name: 'Test Item' };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Test Item');
    expect(text).not.toContain('undefined');
  });

  test('combines quest fields', () => {
    const quest = {
      name: 'Find the Artifact',
      objectives: ['Locate artifact', 'Return to base'],
      trader_name: 'Apollo',
    };

    const text = createSearchableText(Endpoint.QUESTS, quest);

    expect(text).toContain('Find the Artifact');
    expect(text).toContain('Locate artifact');
    expect(text).toContain('Apollo');
  });

  test('combines arc fields', () => {
    const arc = {
      name: 'Sentinel',
      description: 'A large combat robot',
    };

    const text = createSearchableText(Endpoint.ARCS, arc);

    expect(text).toContain('Sentinel');
    expect(text).toContain('large combat robot');
  });
});

describe('Embedder', () => {
  // Note: These tests use the real model which is slow
  // In CI, you may want to skip or mock these

  test('can be constructed with config', () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    expect(embedder).toBeDefined();
  });

  test('embeddings have correct dimension (384 for MiniLM)', async () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    await embedder.initialize();

    const embedding = await embedder.embed('test text');

    expect(embedding).toHaveLength(384);
  }, 60000); // 60s timeout for model download

  test('similar texts have similar embeddings', async () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    await embedder.initialize();

    const emb1 = await embedder.embed('blue light stick');
    const emb2 = await embedder.embed('blue glowing stick');
    const emb3 = await embedder.embed('heavy machine gun');

    // Import from our similarity module
    const { cosineSimilarity } = await import('../src/similarity');

    const similarScore = cosineSimilarity(emb1, emb2);
    const differentScore = cosineSimilarity(emb1, emb3);

    expect(similarScore).toBeGreaterThan(differentScore);
  }, 60000);
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test embeddings
```

**Expected:** Tests FAIL because `embeddings.ts` doesn't exist.

### TDD Step 3: Implement embeddings.ts

Create `packages/search/src/embeddings.ts`:

```typescript
import { pipeline, type Pipeline } from '@xenova/transformers';
import { Endpoint } from '@skippy/shared';

export interface EmbedderConfig {
  modelName: string;
  cacheDir: string;
}

/** Creates searchable text from an entity based on its type. */
export function createSearchableText(endpoint: Endpoint, entity: Record<string, unknown>): string {
  const parts: string[] = [];

  switch (endpoint) {
    case Endpoint.ITEMS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      if (entity.item_type) parts.push(String(entity.item_type));
      if (entity.rarity) parts.push(String(entity.rarity));
      break;
    }
    case Endpoint.ARCS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
    case Endpoint.QUESTS: {
      if (entity.name) parts.push(String(entity.name));
      if (Array.isArray(entity.objectives)) {
        parts.push(...entity.objectives.map(String));
      }
      if (entity.trader_name) parts.push(String(entity.trader_name));
      break;
    }
    case Endpoint.TRADERS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
    case Endpoint.EVENTS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
  }

  return parts.join(' ');
}

/** Generates embeddings using a local transformer model. */
export class Embedder {
  private readonly config: EmbedderConfig;
  private pipeline: Pipeline | null = null;

  constructor(config: EmbedderConfig) {
    this.config = config;
  }

  /** Initializes the embedding model (downloads if needed). */
  async initialize(): Promise<void> {
    if (this.pipeline) return;

    this.pipeline = await pipeline('feature-extraction', this.config.modelName, {
      cache_dir: this.config.cacheDir,
    });
  }

  /** Generates embedding vector for text. */
  async embed(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initialize();
    }

    const output = await this.pipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to regular array
    return Array.from(output.data as Float32Array);
  }

  /** Generates embeddings for multiple texts. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test embeddings
```

**Expected:** All tests PASS (may take time for model download).

### Checkpoint 3B
- [ ] Tests pass
- [ ] `createSearchableText` extracts correct fields per endpoint
- [ ] `Embedder` generates 384-dim vectors

---

## Task 3C: Fuzzy Search

**Depends on:** Wave 1 complete
**Can run parallel with:** 3A, 3B
**Files Created:**
- `packages/search/src/fuzzy.ts`
- `packages/search/test/fuzzy.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/search/test/fuzzy.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { FuzzySearcher, FuzzySearchConfig } from '../src/fuzzy';

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

    expect(results).toHaveLength(1);
    expect(results[0].item.name).toBe('Blue Light Stick');
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

    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map(r => r.item.name);
    expect(names).toContain('Medkit');
    expect(names).toContain('Bandage');
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
```

### TDD Step 2: Run tests - verify RED

```bash
bun test fuzzy
```

**Expected:** Tests FAIL because `fuzzy.ts` doesn't exist.

### TDD Step 3: Implement fuzzy.ts

Create `packages/search/src/fuzzy.ts`:

```typescript
import Fuse, { type IFuseOptions } from 'fuse.js';

export interface FuzzySearchConfig {
  threshold?: number;
  ignoreLocation?: boolean;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

/** Fuzzy string searcher using Fuse.js. */
export class FuzzySearcher<T extends Record<string, unknown>> {
  private readonly fuse: Fuse<T>;

  constructor(
    items: T[],
    keys: string[],
    config: FuzzySearchConfig = {}
  ) {
    const options: IFuseOptions<T> = {
      keys,
      threshold: config.threshold ?? 0.3,
      ignoreLocation: config.ignoreLocation ?? true,
      includeScore: true,
    };

    this.fuse = new Fuse(items, options);
  }

  /** Searches for items matching the query. */
  search(query: string, limit?: number): FuzzyResult<T>[] {
    const rawResults = this.fuse.search(query);

    const results = rawResults.map(result => ({
      item: result.item,
      // Fuse returns lower score = better match, invert to 0-1 where 1 is best
      score: 1 - (result.score ?? 0),
    }));

    if (limit !== undefined) {
      return results.slice(0, limit);
    }

    return results;
  }
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test fuzzy
```

**Expected:** All tests PASS.

### Checkpoint 3C
- [ ] Tests pass
- [ ] Fuzzy search finds partial matches
- [ ] Typos are handled
- [ ] Scores are normalized 0-1

---

## Task 3D: Hybrid Search

**Depends on:** 3A, 3B, 3C complete
**Files Created:**
- `packages/search/src/hybrid.ts`
- `packages/search/test/hybrid.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/search/test/hybrid.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import {
  mergeResults,
  HybridSearcher,
  BOOST_FACTOR,
} from '../src/hybrid';

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
    const fuzzy = [
      { id: '3', score: 0.7 },
    ];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(3);
  });

  test('boosts items found in both result sets', () => {
    const semantic = [{ id: '1', score: 0.8 }];
    const fuzzy = [{ id: '1', score: 0.9 }];

    const merged = mergeResults(semantic, fuzzy);

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBeCloseTo(0.8 * BOOST_FACTOR, 5);
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
```

### TDD Step 2: Run tests - verify RED

```bash
bun test hybrid
```

**Expected:** Tests FAIL because `hybrid.ts` doesn't exist.

### TDD Step 3: Implement hybrid.ts

Create `packages/search/src/hybrid.ts`:

```typescript
import { FuzzySearcher } from './fuzzy';
import { Embedder, createSearchableText } from './embeddings';
import { cosineSimilarity } from './similarity';
import { Endpoint } from '@skippy/shared';

/** Boost multiplier for items found in both semantic and fuzzy results. */
export const BOOST_FACTOR = 1.5;

export interface ScoredId {
  id: string;
  score: number;
}

/** Merges semantic and fuzzy results with boosting. */
export function mergeResults(
  semantic: ScoredId[],
  fuzzy: ScoredId[],
  limit?: number
): ScoredId[] {
  const merged = new Map<string, ScoredId>();
  const fuzzyIds = new Set(fuzzy.map(r => r.id));

  // Add semantic results, boosting if also in fuzzy
  for (const result of semantic) {
    const boosted = fuzzyIds.has(result.id);
    merged.set(result.id, {
      id: result.id,
      score: boosted ? result.score * BOOST_FACTOR : result.score,
    });
  }

  // Add fuzzy-only results
  for (const result of fuzzy) {
    if (!merged.has(result.id)) {
      merged.set(result.id, result);
    }
  }

  // Sort by score descending
  const sorted = Array.from(merged.values()).sort((a, b) => b.score - a.score);

  if (limit !== undefined) {
    return sorted.slice(0, limit);
  }

  return sorted;
}

export interface HybridSearchConfig {
  semanticWeight?: number;
  fuzzyThreshold?: number;
}

/** Combines semantic and fuzzy search for best results. */
export class HybridSearcher<T extends Record<string, unknown>> {
  private readonly items: T[];
  private readonly embeddings: number[][];
  private readonly fuzzySearcher: FuzzySearcher<T>;
  private readonly embedder: Embedder;
  private readonly endpoint: Endpoint;
  private readonly idField: string;

  constructor(
    items: T[],
    embeddings: number[][],
    embedder: Embedder,
    endpoint: Endpoint,
    fuzzyKeys: string[],
    idField: string = 'id',
    config: HybridSearchConfig = {}
  ) {
    this.items = items;
    this.embeddings = embeddings;
    this.embedder = embedder;
    this.endpoint = endpoint;
    this.idField = idField;
    this.fuzzySearcher = new FuzzySearcher(items, fuzzyKeys, {
      threshold: config.fuzzyThreshold ?? 0.3,
    });
  }

  /** Performs hybrid search combining semantic and fuzzy matching. */
  async search(query: string, limit: number = 5): Promise<T[]> {
    // 1. Semantic search
    const queryEmbedding = await this.embedder.embed(query);
    const semanticResults = this.semanticSearch(queryEmbedding, limit * 2);

    // 2. Fuzzy search
    const fuzzyResults = this.fuzzySearcher.search(query, limit * 2).map(r => ({
      id: String(r.item[this.idField]),
      score: r.score,
    }));

    // 3. Merge with boosting
    const merged = mergeResults(semanticResults, fuzzyResults, limit);

    // 4. Map back to items
    const idToItem = new Map(this.items.map(item => [String(item[this.idField]), item]));
    return merged.map(r => idToItem.get(r.id)!).filter(Boolean);
  }

  private semanticSearch(queryEmbedding: number[], limit: number): ScoredId[] {
    const scored: ScoredId[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const score = cosineSimilarity(queryEmbedding, this.embeddings[i]);
      scored.push({
        id: String(this.items[i][this.idField]),
        score,
      });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test hybrid
```

**Expected:** All tests PASS.

### Checkpoint 3D
- [ ] Tests pass
- [ ] `mergeResults` boosts overlapping items
- [ ] Results sorted by score
- [ ] Deduplication works

---

## Task 3E: Index Manager

**Depends on:** 3B complete (needs Embedder)
**Files Created:**
- `packages/search/src/index-manager.ts`
- `packages/search/test/index-manager.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/search/test/index-manager.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  saveEmbeddings,
  loadEmbeddings,
  saveIndex,
  loadIndex,
} from '../src/index-manager';

const TEST_DIR = './test-index-data';

describe('Index Manager', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('saveEmbeddings / loadEmbeddings', () => {
    test('saves and loads embeddings as binary', async () => {
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      const path = join(TEST_DIR, 'embeddings.bin');

      await saveEmbeddings(embeddings, path);
      const loaded = await loadEmbeddings(path, 3);

      expect(loaded).toHaveLength(2);
      expect(loaded[0][0]).toBeCloseTo(0.1, 5);
      expect(loaded[1][2]).toBeCloseTo(0.6, 5);
    });

    test('handles empty embeddings', async () => {
      const path = join(TEST_DIR, 'empty.bin');

      await saveEmbeddings([], path);
      const loaded = await loadEmbeddings(path, 3);

      expect(loaded).toEqual([]);
    });
  });

  describe('saveIndex / loadIndex', () => {
    test('saves and loads ID index', async () => {
      const ids = ['item-1', 'item-2', 'item-3'];
      const path = join(TEST_DIR, 'index.json');

      await saveIndex(ids, path);
      const loaded = await loadIndex(path);

      expect(loaded).toEqual(ids);
    });

    test('maintains order of IDs', async () => {
      const ids = ['z', 'a', 'm'];
      const path = join(TEST_DIR, 'ordered.json');

      await saveIndex(ids, path);
      const loaded = await loadIndex(path);

      expect(loaded[0]).toBe('z');
      expect(loaded[1]).toBe('a');
      expect(loaded[2]).toBe('m');
    });
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test index-manager
```

**Expected:** Tests FAIL because file doesn't exist.

### TDD Step 3: Implement index-manager.ts

Create `packages/search/src/index-manager.ts`:

```typescript
/** Saves embeddings to binary file. */
export async function saveEmbeddings(
  embeddings: number[][],
  path: string
): Promise<void> {
  if (embeddings.length === 0) {
    await Bun.write(path, new Float32Array(0));
    return;
  }

  const dimension = embeddings[0].length;
  const flat = new Float32Array(embeddings.length * dimension);

  for (let i = 0; i < embeddings.length; i++) {
    flat.set(embeddings[i], i * dimension);
  }

  await Bun.write(path, flat);
}

/** Loads embeddings from binary file. */
export async function loadEmbeddings(
  path: string,
  dimension: number
): Promise<number[][]> {
  const file = Bun.file(path);
  const buffer = await file.arrayBuffer();

  if (buffer.byteLength === 0) {
    return [];
  }

  const flat = new Float32Array(buffer);
  const count = flat.length / dimension;
  const embeddings: number[][] = [];

  for (let i = 0; i < count; i++) {
    const start = i * dimension;
    const embedding = Array.from(flat.slice(start, start + dimension));
    embeddings.push(embedding);
  }

  return embeddings;
}

/** Saves ID index to JSON file. */
export async function saveIndex(ids: string[], path: string): Promise<void> {
  await Bun.write(path, JSON.stringify(ids, null, 2));
}

/** Loads ID index from JSON file. */
export async function loadIndex(path: string): Promise<string[]> {
  const file = Bun.file(path);
  const content = await file.text();
  return JSON.parse(content);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test index-manager
```

**Expected:** All tests PASS.

### TDD Step 5: Create package index

Update `packages/search/src/index.ts`:

```typescript
export * from './similarity';
export * from './embeddings';
export * from './fuzzy';
export * from './hybrid';
export * from './index-manager';
```

### Checkpoint 3E
- [ ] Tests pass
- [ ] Binary embeddings save/load correctly
- [ ] JSON index save/load works

---

## Wave 3 Complete Checklist

Before starting Wave 4, verify ALL:

- [ ] `bun test packages/search` - all tests pass
- [ ] `cosineSimilarity` returns correct values
- [ ] `Embedder` generates 384-dim vectors
- [ ] `FuzzySearcher` finds partial matches
- [ ] `mergeResults` boosts overlapping results
- [ ] Binary embedding storage works
- [ ] Can import from `@skippy/search`:
  ```typescript
  import { HybridSearcher, Embedder, FuzzySearcher } from '@skippy/search';
  ```

**Wave 3 is DONE. Proceed to Wave 4.**
