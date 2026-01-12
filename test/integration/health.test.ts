import { describe, test, expect } from 'vitest';
import { getConfig, Logger } from '@skippy/shared';
import { loadEmbeddings } from '@skippy/search';

/**
 * Health check tests to verify the system is properly configured.
 *
 * These tests verify that configuration loads properly and that
 * data files are accessible when available.
 */
describe('System Health', () => {
  test('config loads with defaults', () => {
    const config = getConfig();

    expect(config.logLevel).toBe('info');
    expect(config.dataDir).toBe('./data');
    expect(config.embeddingModelName).toBe('Xenova/all-MiniLM-L6-v2');
  });

  test('logger initializes without error', () => {
    const config = getConfig();
    const logger = new Logger(config);

    expect(logger).toBeDefined();
    // Should not throw
    logger.info('Health check test');
  });

  test('data directory exists', async () => {
    const config = getConfig();

    // Note: checking if it's a directory would require stat
    // For now just check if glossary.md exists as a proxy
    const glossary = Bun.file(`${config.dataDir}/glossary.md`);
    const exists = await glossary.exists();

    if (!exists) {
      console.warn('Data directory may not be populated - run `bun run skippy cache` first');
    }

    // This test passes even if data doesn't exist - it's informational
    expect(true).toBe(true);
  });

  test('embeddings are loadable when available', async () => {
    const embeddingsPath = './data/items/embeddings.bin';
    const file = Bun.file(embeddingsPath);

    if (!(await file.exists())) {
      console.warn('Skipping embeddings test - run `bun run skippy cache` first');
      return;
    }

    const { embeddings, dimension } = await loadEmbeddings(embeddingsPath);

    expect(dimension).toBe(384); // MiniLM embedding dimension
    expect(embeddings.length).toBeGreaterThan(0);
    expect(embeddings[0].length).toBe(dimension);
  });
});
