import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { saveEmbeddings, loadEmbeddings, saveIndex, loadIndex } from '../src/index-manager';

const TEST_DIR = './test-index-data';

describe('Index Manager', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('saveEmbeddings / loadEmbeddings', () => {
    test('saves and loads embeddings as binary', async () => {
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      const path = join(TEST_DIR, 'embeddings.bin');
      const dimension = 3;

      await saveEmbeddings(embeddings, path, dimension);
      const result = await loadEmbeddings(path);

      expect(result.embeddings).toHaveLength(2);
      expect(result.dimension).toBe(3);
      expect(result.embeddings[0][0]).toBeCloseTo(0.1, 5);
      expect(result.embeddings[1][2]).toBeCloseTo(0.6, 5);
    });

    test('handles empty embeddings', async () => {
      const path = join(TEST_DIR, 'empty.bin');

      await saveEmbeddings([], path, 3);
      const result = await loadEmbeddings(path);

      expect(result.embeddings).toEqual([]);
    });

    test('preserves dimension in header', async () => {
      const embeddings = [[0.1, 0.2, 0.3, 0.4, 0.5]];
      const path = join(TEST_DIR, 'dim5.bin');
      const dimension = 5;

      await saveEmbeddings(embeddings, path, dimension);
      const result = await loadEmbeddings(path);

      expect(result.dimension).toBe(5);
      expect(result.embeddings[0]).toHaveLength(5);
    });

    test('handles 384-dimensional embeddings (MiniLM)', async () => {
      // Create a realistic 384-dim embedding
      const embedding = Array.from({ length: 384 }, (_, i) => i / 384);
      const embeddings = [embedding];
      const path = join(TEST_DIR, 'minilm.bin');

      await saveEmbeddings(embeddings, path, 384);
      const result = await loadEmbeddings(path);

      expect(result.dimension).toBe(384);
      expect(result.embeddings[0]).toHaveLength(384);
      expect(result.embeddings[0][0]).toBeCloseTo(0, 5);
      expect(result.embeddings[0][383]).toBeCloseTo(383 / 384, 5);
    });
  });

  describe('saveIndex / loadIndex', () => {
    test('saves and loads ID index', async () => {
      const ids = ['item-1', 'item-2', 'item-3'];
      const path = join(TEST_DIR, 'index.json');

      await saveIndex(ids, path);
      const loaded = await loadIndex(path);

      expect(loaded).toEqual(ids);
    });

    test('maintains order of IDs', async () => {
      const ids = ['z', 'a', 'm'];
      const path = join(TEST_DIR, 'ordered.json');

      await saveIndex(ids, path);
      const loaded = await loadIndex(path);

      expect(loaded[0]).toBe('z');
      expect(loaded[1]).toBe('a');
      expect(loaded[2]).toBe('m');
    });

    test('handles empty ID list', async () => {
      const ids: string[] = [];
      const path = join(TEST_DIR, 'empty-index.json');

      await saveIndex(ids, path);
      const loaded = await loadIndex(path);

      expect(loaded).toEqual([]);
    });
  });
});
