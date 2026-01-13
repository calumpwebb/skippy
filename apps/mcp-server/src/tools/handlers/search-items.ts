import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Item } from '@skippy/shared';
import type { ServerContext } from '../../server';
import { validateFields } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchItemsParamsSchema = BaseSearchParamsSchema.extend({});

export type SearchItemsParams = z.infer<typeof SearchItemsParamsSchema>;

/** Searches for items using hybrid semantic + fuzzy search. */
export async function searchItems(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Item>>> {
  const validated = SearchItemsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields?.length) {
    validateFields(context.schemas[Endpoint.ITEMS], fields);
  }

  const results = await context.searchers[Endpoint.ITEMS].search(query, limit);

  return {
    results: results.map(item => extractFields(item as Item, fields)),
    totalMatches: results.length,
    query,
  };
}
