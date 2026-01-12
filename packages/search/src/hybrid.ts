import { FuzzySearcher } from './fuzzy';
import { Embedder } from './embeddings';
import { cosineSimilarity } from './similarity';
import { Endpoint } from '@skippy/shared';

/** Boost multiplier for items found in both semantic and fuzzy results. */
export const BOOST_FACTOR = 1.5;

export interface ScoredId {
  id: string;
  score: number;
}

/** Merges semantic and fuzzy results with boosting. */
export function mergeResults(semantic: ScoredId[], fuzzy: ScoredId[], limit?: number): ScoredId[] {
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

  // Clamp scores to 0-1 range after boosting
  for (const result of merged.values()) {
    result.score = Math.min(1.0, Math.max(0, result.score));
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

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
