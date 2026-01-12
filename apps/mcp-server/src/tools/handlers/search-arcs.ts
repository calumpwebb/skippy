import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint } from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';

export const SearchArcsParamsSchema = BaseSearchParamsSchema.extend({
  // ARC-specific extensions can be added here
});

export type SearchArcsParams = z.infer<typeof SearchArcsParamsSchema>;

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
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

/** Extracts specified fields from an item. */
export function extractFields(
  item: Record<string, unknown>,
  fields?: string[]
): Record<string, unknown> {
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

/** Gets or creates a cached HybridSearcher for ARCs. */
async function getSearcher(
  context: ServerContext
): Promise<HybridSearcher<Record<string, unknown>>> {
  const cacheKey = Endpoint.ARCS;
  const cached = context.searcherCache.get(cacheKey);
  if (cached) return cached;

  const dataPath = join(context.dataDir, 'arcs');

  // Load data
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  if (!(await dataFile.exists())) {
    throw new Error('ARCs data not found. Run: skippy cache');
  }
  const arcs = (await dataFile.json()) as Record<string, unknown>[];

  // Load embeddings
  const embeddingsPath = join(dataPath, 'embeddings.bin');
  const embeddingsFile = Bun.file(embeddingsPath);
  if (!(await embeddingsFile.exists())) {
    throw new Error('ARCs embeddings not found. Run: skippy cache');
  }
  const { embeddings } = await loadEmbeddings(embeddingsPath);

  // Create embedder
  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher(
    arcs,
    embeddings,
    embedder,
    Endpoint.ARCS,
    ['name', 'description'],
    'id'
  );

  context.searcherCache.set(cacheKey, searcher);
  return searcher;
}

/** Searches for ARCs using hybrid semantic + fuzzy search. */
export async function searchArcs(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Record<string, unknown>>> {
  const validated = SearchArcsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  const searcher = await getSearcher(context);
  const results = await searcher.search(query, limit);

  const extracted = results.map(item => extractFields(item, fields));

  return {
    results: extracted,
    totalMatches: extracted.length,
    query,
  };
}
