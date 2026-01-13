import { pipeline } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';
import { Endpoint } from '@skippy/shared';
import type { Item, Arc, Quest, Trader, Event, GameEntity } from '@skippy/shared';

export interface EmbedderConfig {
  modelName: string;
  cacheDir: string;
}

export function createSearchableText(endpoint: typeof Endpoint.ITEMS, entity: Item): string;
export function createSearchableText(endpoint: typeof Endpoint.ARCS, entity: Arc): string;
export function createSearchableText(endpoint: typeof Endpoint.QUESTS, entity: Quest): string;
export function createSearchableText(endpoint: typeof Endpoint.TRADERS, entity: Trader): string;
export function createSearchableText(endpoint: typeof Endpoint.EVENTS, entity: Event): string;
export function createSearchableText(endpoint: Endpoint, entity: GameEntity): string;
export function createSearchableText(endpoint: Endpoint, entity: GameEntity): string {
  const parts: string[] = [];

  switch (endpoint) {
    case Endpoint.ITEMS: {
      const item = entity as Item;
      if (item.name) parts.push(item.name);
      if (item.description) parts.push(item.description);
      if (item.item_type) parts.push(item.item_type);
      if (item.rarity) parts.push(item.rarity);
      break;
    }
    case Endpoint.ARCS: {
      const arc = entity as Arc;
      if (arc.name) parts.push(arc.name);
      if (arc.description) parts.push(arc.description);
      break;
    }
    case Endpoint.QUESTS: {
      const quest = entity as Quest;
      if (quest.name) parts.push(quest.name);
      if (Array.isArray(quest.objectives)) {
        parts.push(...quest.objectives);
      }
      if (quest.trader_name) parts.push(quest.trader_name);
      break;
    }
    case Endpoint.TRADERS: {
      const trader = entity as Trader;
      if (trader.name) parts.push(trader.name);
      addTraderItems(trader.items, parts);
      break;
    }
    case Endpoint.EVENTS: {
      const event = entity as Event;
      if (event.name) parts.push(event.name);
      if (event.map) parts.push(event.map);
      break;
    }
    default: {
      const _exhaustive: never = endpoint;
      throw new Error(`Unknown endpoint: ${_exhaustive}`);
    }
  }

  return parts.join(' ');
}

/** Adds trader item names and descriptions to the search text parts. */
function addTraderItems(items: Trader['items'] | undefined, parts: string[]): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item.name) parts.push(item.name);
    if (item.description) parts.push(item.description);
  }
}

/** Generates embeddings using a local transformer model. */
export class Embedder {
  private readonly config: EmbedderConfig;
  private pipeline: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: EmbedderConfig) {
    this.config = config;
  }

  /** Initializes the embedding model (downloads if needed). */
  async initialize(): Promise<void> {
    // Use promise-based lock to prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.pipeline) {
      return;
    }

    this.initPromise = this.doInitialize();
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null; // Allow retry on failure
      throw error;
    }
  }

  private async doInitialize(): Promise<void> {
    const timeoutMs = 120000; // 2 minutes for model download

    const initWithTimeout = Promise.race([
      pipeline('feature-extraction', this.config.modelName, {
        cache_dir: this.config.cacheDir,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Model initialization timeout')), timeoutMs)
      ),
    ]);

    this.pipeline = await initWithTimeout;
  }

  /** Cleans up the embedder resources. */
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // @xenova/transformers pipeline cleanup if available
      this.pipeline = null;
    }
    this.initPromise = null;
  }

  /** Generates embedding vector for text. */
  async embed(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initialize();
    }

    const output = await this.pipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to regular array
    return Array.from(output.data as Float32Array);
  }

  /** Generates embeddings for multiple texts. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }
}
