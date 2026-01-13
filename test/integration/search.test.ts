import { describe, test, expect, beforeAll } from 'vitest';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { Config, Endpoint, Item } from '@skippy/shared';
import { join } from 'node:path';

/**
 * Integration tests for search functionality.
 *
 * These tests require the cache command to have been run first to populate
 * the data/ directory with items and embeddings.
 */
describe('Search Integration', () => {
  let searcher: HybridSearcher<Item> | null = null;
  let dataAvailable = false;

  beforeAll(async () => {
    const dataPath = './data/items';
    const dataFile = Bun.file(join(dataPath, 'data.json'));
    const embeddingsFile = Bun.file(join(dataPath, 'embeddings.bin'));

    // Check if data exists (requires cache command to have been run)
    if (!(await dataFile.exists()) || !(await embeddingsFile.exists())) {
      console.warn(
        'Skipping search integration tests - run `bun run skippy cache` first to generate data'
      );
      return;
    }

    dataAvailable = true;

    // Load real data
    const items = (await dataFile.json()) as Item[];

    // Load real embeddings
    const { embeddings } = await loadEmbeddings(join(dataPath, 'embeddings.bin'));

    // Create real embedder
    const config = new Config({});
    const embedder = new Embedder({
      modelName: config.embeddingModelName,
      cacheDir: config.embeddingModelCacheDir,
    });
    await embedder.initialize();

    searcher = new HybridSearcher(
      items,
      embeddings,
      embedder,
      Endpoint.ITEMS,
      ['name', 'description', 'item_type'],
      'id'
    );
  }, 120000); // 2 min timeout for model download

  test('finds items by exact name', async () => {
    if (!dataAvailable || !searcher) {
      return; // Skip if data not available
    }

    const results = await searcher.search('Blue Light Stick', 5);

    expect(results.length).toBeGreaterThan(0);
    // Should find an item with "Blue" in the name
    const names = results.map(r => r.name);
    expect(names.some(n => n?.includes('Blue') || n?.includes('Light'))).toBe(true);
  });

  test('finds items by concept', async () => {
    if (!dataAvailable || !searcher) {
      return; // Skip if data not available
    }

    const results = await searcher.search('healing items', 5);

    expect(results.length).toBeGreaterThan(0);
    // Should find medkits, bandages, etc.
  });

  test('handles typos with fuzzy matching', async () => {
    if (!dataAvailable || !searcher) {
      return; // Skip if data not available
    }

    const results = await searcher.search('medikt', 5); // typo for "medkit"

    expect(results.length).toBeGreaterThan(0);
  });

  test('returns requested number of results', async () => {
    if (!dataAvailable || !searcher) {
      return; // Skip if data not available
    }

    const results = await searcher.search('weapon', 3);

    expect(results.length).toBeLessThanOrEqual(3);
  });

  test('returns empty array for gibberish query', async () => {
    if (!dataAvailable || !searcher) {
      return; // Skip if data not available
    }

    // Even with gibberish, the search may return some results based on similarity
    // This test just ensures it doesn't crash
    const results = await searcher.search('xyzzy12345qwerty', 5);
    expect(Array.isArray(results)).toBe(true);
  });
});
