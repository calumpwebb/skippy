import { describe, test, expect } from 'vitest';
import { Embedder, createSearchableText, EmbedderConfig } from '../src/embeddings';
import { Endpoint } from '@skippy/shared';

describe('createSearchableText', () => {
  test('combines item fields into searchable text', () => {
    const item = {
      name: 'Blue Light Stick',
      description: 'A glowing stick',
      item_type: 'Quick Use',
      rarity: 'Common',
    };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Blue Light Stick');
    expect(text).toContain('A glowing stick');
    expect(text).toContain('Quick Use');
    expect(text).toContain('Common');
  });

  test('handles missing fields gracefully', () => {
    const item = { name: 'Test Item' };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Test Item');
    expect(text).not.toContain('undefined');
  });

  test('combines quest fields', () => {
    const quest = {
      name: 'Find the Artifact',
      objectives: ['Locate artifact', 'Return to base'],
      trader_name: 'Apollo',
    };

    const text = createSearchableText(Endpoint.QUESTS, quest);

    expect(text).toContain('Find the Artifact');
    expect(text).toContain('Locate artifact');
    expect(text).toContain('Apollo');
  });

  test('combines arc fields', () => {
    const arc = {
      name: 'Sentinel',
      description: 'A large combat robot',
    };

    const text = createSearchableText(Endpoint.ARCS, arc);

    expect(text).toContain('Sentinel');
    expect(text).toContain('large combat robot');
  });
});

describe('Embedder', () => {
  // Note: These tests use the real model which is slow
  // In CI, you may want to skip or mock these

  test('can be constructed with config', () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    expect(embedder).toBeDefined();
  });

  test('embeddings have correct dimension (384 for MiniLM)', async () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    await embedder.initialize();

    const embedding = await embedder.embed('test text');

    expect(embedding).toHaveLength(384);
  }, 60000); // 60s timeout for model download

  test('similar texts have similar embeddings', async () => {
    const config: EmbedderConfig = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      cacheDir: './models',
    };

    const embedder = new Embedder(config);
    await embedder.initialize();

    const emb1 = await embedder.embed('blue light stick');
    const emb2 = await embedder.embed('blue glowing stick');
    const emb3 = await embedder.embed('heavy machine gun');

    // Import from our similarity module
    const { cosineSimilarity } = await import('../src/similarity');

    const similarScore = cosineSimilarity(emb1, emb2);
    const differentScore = cosineSimilarity(emb1, emb3);

    expect(similarScore).toBeGreaterThan(differentScore);
  }, 60000);
});
