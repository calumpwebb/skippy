import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Quest } from '@skippy/shared';
import type { ServerContext } from '../../server';
import { validateFields } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchQuestsParamsSchema = BaseSearchParamsSchema.extend({});

export type SearchQuestsParams = z.infer<typeof SearchQuestsParamsSchema>;

/** Searches for quests using hybrid semantic + fuzzy search. */
export async function searchQuests(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Quest>>> {
  const validated = SearchQuestsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields?.length) {
    validateFields(context.schemas[Endpoint.QUESTS], fields);
  }

  const results = await context.searchers[Endpoint.QUESTS].search(query, limit);

  return {
    results: results.map(item => extractFields(item as Quest, fields)),
    totalMatches: results.length,
    query,
  };
}
