import { pipeline, type Pipeline } from '@xenova/transformers';
import { Endpoint } from '@skippy/shared';

export interface EmbedderConfig {
  modelName: string;
  cacheDir: string;
}

/** Creates searchable text from an entity based on its type. */
export function createSearchableText(endpoint: Endpoint, entity: Record<string, unknown>): string {
  const parts: string[] = [];

  switch (endpoint) {
    case Endpoint.ITEMS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      if (entity.item_type) parts.push(String(entity.item_type));
      if (entity.rarity) parts.push(String(entity.rarity));
      break;
    }
    case Endpoint.ARCS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
    case Endpoint.QUESTS: {
      if (entity.name) parts.push(String(entity.name));
      if (Array.isArray(entity.objectives)) {
        parts.push(...entity.objectives.map(String));
      }
      if (entity.trader_name) parts.push(String(entity.trader_name));
      break;
    }
    case Endpoint.TRADERS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
    case Endpoint.EVENTS: {
      if (entity.name) parts.push(String(entity.name));
      if (entity.description) parts.push(String(entity.description));
      break;
    }
    default: {
      // Exhaustive check - if new endpoint added, this will fail compilation
      const _exhaustive: never = endpoint;
      throw new Error(`Unknown endpoint: ${_exhaustive}`);
    }
  }

  return parts.join(' ');
}

/** Generates embeddings using a local transformer model. */
export class Embedder {
  private readonly config: EmbedderConfig;
  private pipeline: Pipeline | null = null;
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
