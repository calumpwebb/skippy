/** Parameters common to all search tools (legacy interface version). */
export interface SearchParams {
  query: string;
  fields?: string[];
  limit?: number;
}

/** Result structure returned by all search tools (legacy interface version). */
export interface SearchResult<T> {
  results: T[];
  totalMatches: number;
  query: string;
}

/** Internal search result with score for ranking. */
export interface ScoredResult<T> {
  item: T;
  score: number;
}
