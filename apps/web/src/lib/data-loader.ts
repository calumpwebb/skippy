import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  Endpoint,
  SearchableEntity,
  ItemSchema,
  ArcSchema,
  QuestSchema,
  TraderSchema,
  EventSchema,
  Event,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import type { ToolContext } from './tools';

/** Endpoints that support hybrid search (excludes events). */
const SearchEndpoint = [Endpoint.ITEMS, Endpoint.ARCS, Endpoint.QUESTS, Endpoint.TRADERS] as const;

type SearchEndpointType = (typeof SearchEndpoint)[number];

/** Configuration for each searchable endpoint. */
interface EndpointConfig {
  searchFields: string[];
  idField: string;
}

const ENDPOINT_CONFIGS: Record<SearchEndpointType, EndpointConfig> = {
  [Endpoint.ITEMS]: { searchFields: ['name', 'description', 'item_type'], idField: 'id' },
  [Endpoint.ARCS]: { searchFields: ['name', 'description'], idField: 'id' },
  [Endpoint.QUESTS]: { searchFields: ['name', 'trader_name'], idField: 'id' },
  [Endpoint.TRADERS]: { searchFields: ['name'], idField: 'name' },
};

/** Zod schemas for runtime validation of loaded data. */
const ENTITY_SCHEMAS: Record<SearchEndpointType, z.ZodArray<z.ZodTypeAny>> = {
  [Endpoint.ITEMS]: z.array(ItemSchema),
  [Endpoint.ARCS]: z.array(ArcSchema),
  [Endpoint.QUESTS]: z.array(QuestSchema),
  [Endpoint.TRADERS]: z.array(TraderSchema),
};

/** Cached tool context - lazily initialized once. */
let toolContextPromise: Promise<ToolContext> | null = null;

/** Gets the tool context, initializing it on first call. */
export function getToolContext(): Promise<ToolContext> {
  if (!toolContextPromise) {
    toolContextPromise = initializeToolContext();
  }
  return toolContextPromise;
}

/** Initializes the tool context with searchers and events. */
async function initializeToolContext(): Promise<ToolContext> {
  const dataDir = process.env.DATA_DIR ?? './data';
  const modelName = process.env.EMBEDDING_MODEL_NAME ?? 'Xenova/all-MiniLM-L6-v2';
  const modelCacheDir = process.env.EMBEDDING_MODEL_CACHE_DIR ?? './models';

  // Initialize shared embedder
  const embedder = new Embedder({
    modelName,
    cacheDir: modelCacheDir,
  });
  await embedder.initialize();

  const searchers = {} as Record<SearchEndpointType, HybridSearcher<SearchableEntity>>;

  // Load searchable endpoints
  for (const endpoint of SearchEndpoint) {
    const endpointDir = join(dataDir, endpoint);
    const endpointConfig = ENDPOINT_CONFIGS[endpoint];

    // Load data.json
    const dataPath = join(endpointDir, 'data.json');
    const rawDataContent = await readFile(dataPath, 'utf-8');
    const rawData = JSON.parse(rawDataContent);
    const data = ENTITY_SCHEMAS[endpoint].parse(rawData) as SearchableEntity[];

    // Load embeddings.bin
    const embeddingsPath = join(endpointDir, 'embeddings.bin');
    const { embeddings } = await loadEmbeddings(embeddingsPath);

    // Create searcher
    searchers[endpoint] = new HybridSearcher(
      data,
      embeddings,
      embedder,
      endpoint,
      endpointConfig.searchFields,
      endpointConfig.idField
    );
  }

  // Load events
  const eventsPath = join(dataDir, 'events', 'data.json');
  const rawEventsContent = await readFile(eventsPath, 'utf-8');
  const rawEvents = JSON.parse(rawEventsContent);
  const events = z.array(EventSchema).parse(rawEvents) as Event[];

  return { searchers, events };
}
