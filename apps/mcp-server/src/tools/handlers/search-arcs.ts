import { z } from 'zod';
import {
  BaseSearchParamsSchema,
  BaseSearchResult,
  Endpoint,
  Arc,
  SearchableEntity,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';
import { loadSchema, validateFields, Schema } from '../../utils/schema';
import { extractFields } from '../../utils/fields';

export const SearchArcsParamsSchema = BaseSearchParamsSchema.extend({
  // ARC-specific extensions can be added here
});

export type SearchArcsParams = z.infer<typeof SearchArcsParamsSchema>;

/** Gets or creates a cached HybridSearcher for ARCs. */
async function getSearcher(context: ServerContext): Promise<HybridSearcher<Arc>> {
  const cacheKey = Endpoint.ARCS;
  const cached = context.searcherCache.get(cacheKey);
  if (cached) return cached as HybridSearcher<Arc>;

  const dataPath = join(context.dataDir, 'arcs');

  // Load data with proper type
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  const arcs = (await dataFile.json()) as Arc[];

  // Load embeddings
  const embeddingsPath = join(dataPath, 'embeddings.bin');
  const { embeddings } = await loadEmbeddings(embeddingsPath);

  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher<Arc>(
    arcs,
    embeddings,
    embedder,
    Endpoint.ARCS,
    ['name', 'description'],
    'id'
  );

  context.searcherCache.set(cacheKey, searcher as HybridSearcher<SearchableEntity>);
  return searcher;
}

/** Gets or creates a cached schema for ARCs. */
async function getSchema(context: ServerContext): Promise<Schema | null> {
  const cacheKey = Endpoint.ARCS;
  const cached = context.schemaCache.get(cacheKey);
  if (cached) return cached;

  try {
    const schema = await loadSchema(context.dataDir, Endpoint.ARCS);
    context.schemaCache.set(cacheKey, schema);
    return schema;
  } catch {
    return null;
  }
}

/** Searches for ARCs using hybrid semantic + fuzzy search. */
export async function searchArcs(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Arc>>> {
  const validated = SearchArcsParamsSchema.parse(params);
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
