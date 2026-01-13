import { z } from 'zod';
import {
  BaseSearchParamsSchema,
  BaseSearchResult,
  Endpoint,
  Trader,
  SearchableEntity,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';
import { loadSchema, validateFields, Schema } from '../../utils/schema';

export const SearchTradersParamsSchema = BaseSearchParamsSchema.extend({
  // Trader-specific extensions can be added here
});

export type SearchTradersParams = z.infer<typeof SearchTradersParamsSchema>;

export const TRADER_ID_FIELD = 'name';

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
function getNestedValue(obj: object, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

/** Extracts specified fields from a trader. */
export function extractFields(trader: Trader, fields?: string[]): Partial<Trader> {
  if (!fields || fields.length === 0) {
    return trader;
  }

  // Validate all field paths first
  for (const field of fields) {
    validateFieldPath(field);
  }

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getNestedValue(trader, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}

/** Gets or creates a cached HybridSearcher for traders. */
async function getSearcher(context: ServerContext): Promise<HybridSearcher<Trader>> {
  const cacheKey = Endpoint.TRADERS;
  const cached = context.searcherCache.get(cacheKey);
  if (cached) return cached as HybridSearcher<Trader>;

  const dataPath = join(context.dataDir, 'traders');

  // Load data
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  if (!(await dataFile.exists())) {
    throw new Error('Traders data not found. Run: skippy cache');
  }
  const traders = (await dataFile.json()) as Trader[];

  // Load embeddings
  const embeddingsPath = join(dataPath, 'embeddings.bin');
  const embeddingsFile = Bun.file(embeddingsPath);
  if (!(await embeddingsFile.exists())) {
    throw new Error('Traders embeddings not found. Run: skippy cache');
  }
  const { embeddings } = await loadEmbeddings(embeddingsPath);

  // Create embedder
  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher<Trader>(
    traders,
    embeddings,
    embedder,
    Endpoint.TRADERS,
    ['name'],
    TRADER_ID_FIELD
  );

  context.searcherCache.set(cacheKey, searcher as HybridSearcher<SearchableEntity>);
  return searcher;
}

/** Gets or creates a cached schema for traders. */
async function getSchema(context: ServerContext): Promise<Schema | null> {
  const cacheKey = Endpoint.TRADERS;
  const cached = context.schemaCache.get(cacheKey);
  if (cached) return cached;

  try {
    const schema = await loadSchema(context.dataDir, Endpoint.TRADERS);
    context.schemaCache.set(cacheKey, schema);
    return schema;
  } catch {
    return null;
  }
}

/** Searches for traders using hybrid semantic + fuzzy search. */
export async function searchTraders(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Trader>>> {
  const validated = SearchTradersParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  if (fields && fields.length > 0) {
    const schema = await getSchema(context);
    if (schema) {
      validateFields(schema, fields);
    }
  }

  const searcher = await getSearcher(context);
  const results = await searcher.search(query, limit);

  const extracted = results.map(trader => extractFields(trader, fields));

  return {
    results: extracted,
    totalMatches: extracted.length,
    query,
  };
}
