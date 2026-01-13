import { z } from 'zod';
import {
  BaseSearchParamsSchema,
  BaseSearchResult,
  Endpoint,
  Item,
  SearchableEntity,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';
import { loadSchema, validateFields, Schema } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchItemsParamsSchema = BaseSearchParamsSchema.extend({
  // Item-specific extensions can be added here
});

export type SearchItemsParams = z.infer<typeof SearchItemsParamsSchema>;

/** Gets or creates a cached HybridSearcher for items. */
async function getSearcher(context: ServerContext): Promise<HybridSearcher<Item>> {
  const cacheKey = Endpoint.ITEMS;
  const cached = context.searcherCache.get(cacheKey);
  if (cached) return cached as HybridSearcher<Item>;

  const dataPath = join(context.dataDir, 'items');

  // Load data
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  if (!(await dataFile.exists())) {
    throw new Error('Items data not found. Run: skippy cache');
  }
  const items = (await dataFile.json()) as Item[];

  // Load embeddings
  const embeddingsPath = join(dataPath, 'embeddings.bin');
  const embeddingsFile = Bun.file(embeddingsPath);
  if (!(await embeddingsFile.exists())) {
    throw new Error('Items embeddings not found. Run: skippy cache');
  }
  const { embeddings } = await loadEmbeddings(embeddingsPath);

  // Create embedder
  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher<Item>(
    items,
    embeddings,
    embedder,
    Endpoint.ITEMS,
    ['name', 'description', 'item_type'],
    'id'
  );

  context.searcherCache.set(cacheKey, searcher as HybridSearcher<SearchableEntity>);
  return searcher;
}

/** Gets or creates a cached schema for items. */
async function getSchema(context: ServerContext): Promise<Schema | null> {
  const cacheKey = Endpoint.ITEMS;
  const cached = context.schemaCache.get(cacheKey);
  if (cached) return cached;

  try {
    const schema = await loadSchema(context.dataDir, Endpoint.ITEMS);
    context.schemaCache.set(cacheKey, schema);
    return schema;
  } catch {
    return null;
  }
}

/** Searches for items using hybrid semantic + fuzzy search. */
export async function searchItems(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Item>>> {
  const validated = SearchItemsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields && fields.length > 0) {
    const schema = await getSchema(context);
    if (schema) {
      validateFields(schema, fields);
    }
  }

  const searcher = await getSearcher(context);
  const results = await searcher.search(query, limit);

  const extracted = results.map(item => extractFields(item, fields));

  return {
    results: extracted,
    totalMatches: extracted.length,
    query,
  };
}
