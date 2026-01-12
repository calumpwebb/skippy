/** Parameters common to all search tools. */
export interface BaseSearchParams {
  query: string;
  fields?: string[];
  limit?: number;
}

/** Result structure returned by all search tools. */
export interface BaseSearchResult<T> {
  results: T[];
  totalMatches: number;
  query: string;
}

/** Internal search result with score for ranking. */
export interface ScoredResult<T> {
  item: T;
  score: number;
}
