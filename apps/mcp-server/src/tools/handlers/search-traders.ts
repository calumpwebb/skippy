import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Trader } from '@skippy/shared';
import type { ServerContext } from '../../server';
import { validateFields } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchTradersParamsSchema = BaseSearchParamsSchema.extend({});

export type SearchTradersParams = z.infer<typeof SearchTradersParamsSchema>;

/** Searches for traders using hybrid semantic + fuzzy search. */
export async function searchTraders(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Trader>>> {
  const validated = SearchTradersParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields?.length) {
    validateFields(context.schemas[Endpoint.TRADERS], fields);
  }

  const results = await context.searchers[Endpoint.TRADERS].search(query, limit);

  return {
    results: results.map(trader => extractFields(trader as Trader, fields)),
    totalMatches: results.length,
    query,
  };
}
