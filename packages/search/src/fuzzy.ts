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
export class FuzzySearcher<T extends object> {
  private readonly fuse: Fuse<T>;

  constructor(items: T[], keys: string[], config: FuzzySearchConfig = {}) {
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
