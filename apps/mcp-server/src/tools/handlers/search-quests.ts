import { z } from 'zod';
import {
  BaseSearchParamsSchema,
  BaseSearchResult,
  Endpoint,
  Quest,
  SearchableEntity,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';
import { loadSchema, validateFields, Schema } from '../../utils/schema';

export const SearchQuestsParamsSchema = BaseSearchParamsSchema.extend({
  // Quest-specific extensions can be added here
});

export type SearchQuestsParams = z.infer<typeof SearchQuestsParamsSchema>;

const FORBIDDEN_PATHS = ['__proto__', 'constructor', 'prototype'];
const MAX_FIELD_DEPTH = 4;

/** Validates a field path for security. */
export function validateFieldPath(path: string): void {
  const parts = path.split('.');

  if (parts.length > MAX_FIELD_DEPTH) {
    throw new Error(`Field path too deep: ${path}`);
  }

  for (const part of parts) {
    if (FORBIDDEN_PATHS.includes(part.toLowerCase())) {
      throw new Error(`Invalid field path: ${path}`);
    }
  }
}

/** Gets a nested value from an object using dot notation. */
function getNestedValue(obj: Quest, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

/** Extracts specified fields from an item. */
export function extractFields(item: Quest, fields?: string[]): Partial<Quest> {
  if (!fields || fields.length === 0) {
    return item;
  }

  // Validate all field paths first
  for (const field of fields) {
    validateFieldPath(field);
  }

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getNestedValue(item, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}

/** Gets or creates a cached HybridSearcher for quests. */
async function getSearcher(context: ServerContext): Promise<HybridSearcher<Quest>> {
  const cacheKey = Endpoint.QUESTS;
  const cached = context.searcherCache.get(cacheKey);
  if (cached) return cached as HybridSearcher<Quest>;

  const dataPath = join(context.dataDir, 'quests');

  // Load data
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  if (!(await dataFile.exists())) {
    throw new Error('Quests data not found. Run: skippy cache');
  }
  const quests = (await dataFile.json()) as Quest[];

  // Load embeddings
  const embeddingsPath = join(dataPath, 'embeddings.bin');
  const embeddingsFile = Bun.file(embeddingsPath);
  if (!(await embeddingsFile.exists())) {
    throw new Error('Quests embeddings not found. Run: skippy cache');
  }
  const { embeddings } = await loadEmbeddings(embeddingsPath);

  // Create embedder
  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher<Quest>(
    quests,
    embeddings,
    embedder,
    Endpoint.QUESTS,
    ['name', 'trader_name'],
    'id'
  );

  context.searcherCache.set(cacheKey, searcher as HybridSearcher<SearchableEntity>);
  return searcher;
}

/** Gets or creates a cached schema for quests. */
async function getSchema(context: ServerContext): Promise<Schema | null> {
  const cacheKey = Endpoint.QUESTS;
  const cached = context.schemaCache.get(cacheKey);
  if (cached) return cached;

  try {
    const schema = await loadSchema(context.dataDir, Endpoint.QUESTS);
    context.schemaCache.set(cacheKey, schema);
    return schema;
  } catch {
    return null;
  }
}

/** Searches for quests using hybrid semantic + fuzzy search. */
export async function searchQuests(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Quest>>> {
  const validated = SearchQuestsParamsSchema.parse(params);
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
