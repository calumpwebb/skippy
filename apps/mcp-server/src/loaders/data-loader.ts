import { join } from 'node:path';
import { z } from 'zod';
import {
  Config,
  Logger,
  Endpoint,
  formatBytes,
  Event,
  SearchableEntity,
  ItemSchema,
  ArcSchema,
  QuestSchema,
  TraderSchema,
  EventSchema,
} from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { loadSchema, Schema } from '../utils/schema';

/** Endpoints that support hybrid search (excludes events). */
export const SearchEndpoint = [
  Endpoint.ITEMS,
  Endpoint.ARCS,
  Endpoint.QUESTS,
  Endpoint.TRADERS,
] as const;

export type SearchEndpointType = (typeof SearchEndpoint)[number];

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

/** Data loaded at server startup. */
export interface LoadedData {
  searchers: Record<SearchEndpointType, HybridSearcher<SearchableEntity>>;
  schemas: Record<Endpoint, Schema>;
  events: Event[];
}

/** Loads all game data at server startup. */
export async function loadAllData(
  dataDir: string,
  config: Config,
  logger: Logger
): Promise<LoadedData> {
  logger.info('Loading game data...', { dataDir });

  // Initialize shared embedder
  const embedder = new Embedder({
    modelName: config.embeddingModelName,
    cacheDir: config.embeddingModelCacheDir,
  });
  await embedder.initialize();
  logger.success('Embedding model ready');

  const searchers = {} as Record<SearchEndpointType, HybridSearcher<SearchableEntity>>;
  const schemas = {} as Record<Endpoint, Schema>;

  // Load searchable endpoints
  for (const endpoint of SearchEndpoint) {
    const endpointLogger = logger.child({ endpoint });
    const endpointDir = join(dataDir, endpoint);
    const endpointConfig = ENDPOINT_CONFIGS[endpoint];

    // Load and log data.json
    const dataPath = join(endpointDir, 'data.json');
    const dataFile = Bun.file(dataPath);
    if (!(await dataFile.exists())) {
      throw new Error(`${endpoint} data not found at ${dataPath}. Run: skippy cache`);
    }
    const dataSize = dataFile.size;
    const rawData = await dataFile.json();
    const data = ENTITY_SCHEMAS[endpoint].parse(rawData) as SearchableEntity[];
    endpointLogger.info(`Loaded data.json (${formatBytes(dataSize)}, ${data.length} items)`);

    // Load and log embeddings.bin
    const embeddingsPath = join(endpointDir, 'embeddings.bin');
    const embeddingsFile = Bun.file(embeddingsPath);
    if (!(await embeddingsFile.exists())) {
      throw new Error(`${endpoint} embeddings not found at ${embeddingsPath}. Run: skippy cache`);
    }
    const embeddingsSize = embeddingsFile.size;
    const { embeddings } = await loadEmbeddings(embeddingsPath);
    endpointLogger.info(`Loaded embeddings.bin (${formatBytes(embeddingsSize)})`);

    // Load schema
    const schema = await loadSchema(dataDir, endpoint);
    schemas[endpoint] = schema;

    // Create searcher
    searchers[endpoint] = new HybridSearcher(
      data,
      embeddings,
      embedder,
      endpoint,
      endpointConfig.searchFields,
      endpointConfig.idField
    );

    endpointLogger.success('Ready');
  }

  // Load events (not searchable)
  const eventsPath = join(dataDir, 'events', 'data.json');
  const eventsFile = Bun.file(eventsPath);
  if (!(await eventsFile.exists())) {
    throw new Error(`Events data not found at ${eventsPath}. Run: skippy cache`);
  }
  const eventsSize = eventsFile.size;
  const rawEvents = await eventsFile.json();
  const events = z.array(EventSchema).parse(rawEvents);
  logger.info(`Loaded events/data.json (${formatBytes(eventsSize)}, ${events.length} events)`);

  // Load events schema
  schemas[Endpoint.EVENTS] = await loadSchema(dataDir, Endpoint.EVENTS);

  logger.success('All game data loaded');

  return { searchers, schemas, events };
}
