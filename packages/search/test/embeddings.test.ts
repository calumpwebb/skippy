import { describe, test, expect } from 'vitest';
import { Embedder, createSearchableText, EmbedderConfig } from '../src/embeddings';
import { Endpoint } from '@skippy/shared';
import type { Item, Arc, Quest, Trader, Event } from '@skippy/shared';

describe('createSearchableText', () => {
  test('combines item fields into searchable text', () => {
    const item: Item = {
      id: 'test-item-id',
      name: 'Blue Light Stick',
      description: 'A glowing stick',
      item_type: 'Quick Use',
      loadout_slots: [],
      icon: 'test-icon',
      rarity: 'Common',
      value: 100,
      workbench: null,
      stat_block: {} as Item['stat_block'],
      flavor_text: '',
      subcategory: '',
      created_at: '',
      updated_at: '',
      shield_type: '',
      loot_area: '',
      sources: null,
      ammo_type: '',
      locations: [],
      guide_links: [],
      game_asset_id: 1,
    };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Blue Light Stick');
    expect(text).toContain('A glowing stick');
    expect(text).toContain('Quick Use');
    expect(text).toContain('Common');
  });

  test('handles missing fields gracefully', () => {
    const item: Item = {
      id: 'test-item-id',
      name: 'Test Item',
      description: '',
      item_type: '',
      loadout_slots: [],
      icon: '',
      rarity: '',
      value: 0,
      workbench: null,
      stat_block: {} as Item['stat_block'],
      flavor_text: '',
      subcategory: '',
      created_at: '',
      updated_at: '',
      shield_type: '',
      loot_area: '',
      sources: null,
      ammo_type: '',
      locations: [],
      guide_links: [],
      game_asset_id: 1,
    };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Test Item');
    expect(text).not.toContain('undefined');
  });

  test('combines quest fields', () => {
    const quest: Quest = {
      id: 'test-quest-id',
      name: 'Find the Artifact',
      objectives: ['Locate artifact', 'Return to base'],
      xp: 500,
      granted_items: [],
      created_at: '',
      updated_at: '',
      locations: [],
      marker_category: null,
      image: '',
      guide_links: [],
      trader_name: 'Apollo',
      sort_order: 1,
      position: { x: 0, y: 0 },
      required_items: [],
      rewards: [],
    };

    const text = createSearchableText(Endpoint.QUESTS, quest);

    expect(text).toContain('Find the Artifact');
    expect(text).toContain('Locate artifact');
    expect(text).toContain('Apollo');
  });

  test('combines arc fields', () => {
    const arc: Arc = {
      id: 'test-arc-id',
      name: 'Sentinel',
      description: 'A large combat robot',
      icon: 'test-icon',
      image: 'test-image',
      created_at: '',
      updated_at: '',
    };

    const text = createSearchableText(Endpoint.ARCS, arc);

    expect(text).toContain('Sentinel');
    expect(text).toContain('large combat robot');
  });

  test('combines trader fields', () => {
    const trader: Trader = {
      name: 'Apollo Trader',
      items: [
        {
          id: 'item-1',
          icon: '',
          name: 'Medkit',
          value: 100,
          rarity: 'Common',
          item_type: 'Medical',
          description: 'Heals wounds',
          trader_price: 50,
        },
      ],
    };

    const text = createSearchableText(Endpoint.TRADERS, trader);

    expect(text).toContain('Apollo Trader');
    expect(text).toContain('Medkit');
    expect(text).toContain('Heals wounds');
  });

  test('combines event fields', () => {
    const event: Event = {
      name: 'Double XP Weekend',
      map: 'All Maps',
      icon: 'event-icon',
      startTime: Date.now(),
      endTime: Date.now() + 86400000,
    };

    const text = createSearchableText(Endpoint.EVENTS, event);

    expect(text).toContain('Double XP Weekend');
    expect(text).toContain('All Maps');
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
