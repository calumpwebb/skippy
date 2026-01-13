import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Arc } from '@skippy/shared';
import type { ServerContext } from '../../server';
import { validateFields } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchArcsParamsSchema = BaseSearchParamsSchema.extend({});

export type SearchArcsParams = z.infer<typeof SearchArcsParamsSchema>;

/** Searches for ARCs using hybrid semantic + fuzzy search. */
export async function searchArcs(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Arc>>> {
  const validated = SearchArcsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields?.length) {
    validateFields(context.schemas[Endpoint.ARCS], fields);
  }

  const results = await context.searchers[Endpoint.ARCS].search(query, limit);

  return {
    results: results.map(item => extractFields(item as Arc, fields)),
    totalMatches: results.length,
    query,
  };
}
