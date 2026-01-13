import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Endpoint,
  Config,
  Logger,
  atomicWrite,
  ensureTrailingNewline,
  formatBytes,
  GameEntity,
} from '@skippy/shared';

/** Gets file size in bytes. */
async function getFileSizeBytes(path: string): Promise<number> {
  const { size } = await stat(path);
  return size;
}
import { Embedder, createSearchableText, saveEmbeddings } from '@skippy/search';
import { downloadAndNormalize } from './download';
import { generateZodSchema } from './generate-zod-schemas';
import { createFixture } from './generate-test-fixtures';

export interface CacheOptions {
  dataDir: string;
  endpoints: Endpoint[];
  generateTypes: boolean;
  generateFixtures: boolean;
  /** Called when starting to process an endpoint. */
  onProgress?: (endpoint: Endpoint, index: number, total: number) => void;
}

export interface CacheResult {
  endpoint: Endpoint;
  success: boolean;
  error?: string;
  itemCount?: number;
}

const DEFAULT_OPTIONS: CacheOptions = {
  dataDir: './data',
  endpoints: Object.values(Endpoint) as Endpoint[],
  generateTypes: true,
  generateFixtures: true,
};

/** Main cache runner - downloads and processes all data. */
export async function runCache(
  config: Config,
  logger: Logger,
  options: Partial<CacheOptions> = {}
): Promise<CacheResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dataDir, endpoints } = opts;

  logger.info('Starting cache update', { dataDir, endpoints: endpoints.length });

  // Initialize embedder once for all endpoints
  const embedder = new Embedder({
    modelName: config.embeddingModelName,
    cacheDir: config.embeddingModelCacheDir,
  });
  logger.info('Initializing embedding model...');
  await embedder.initialize();
  logger.success('Embedding model ready');

  const results: CacheResult[] = [];
  let totalBytes = 0;

  for (const [i, endpoint] of endpoints.entries()) {
    opts.onProgress?.(endpoint, i, endpoints.length);

    const endpointDir = join(dataDir, endpoint);
    await mkdir(endpointDir, { recursive: true });

    const endpointLogger = logger.child({ endpoint });
    let endpointBytes = 0;

    try {
      // 1. Download and normalize
      endpointLogger.info('Downloading...');
      const data = await downloadAndNormalize(endpoint);
      endpointLogger.success(`Downloaded ${data.length} items`);

      // 2. Write data atomically
      const dataPath = join(endpointDir, 'data.json');
      await atomicWrite(dataPath, ensureTrailingNewline(JSON.stringify(data, null, 2)));
      const dataSize = await getFileSizeBytes(dataPath);
      totalBytes += dataSize;
      endpointBytes += dataSize;
      endpointLogger.success(`Wrote data.json (${formatBytes(dataSize)})`);

      // 3. Generate embeddings for search
      if (data.length > 0) {
        endpointLogger.info('Generating embeddings...');
        const texts = data.map(item => createSearchableText(endpoint, item as GameEntity));
        const embeddings = await embedder.embedBatch(texts);
        const embeddingsPath = join(endpointDir, 'embeddings.bin');
        const dimension = embeddings[0]?.length ?? 384;
        await saveEmbeddings(embeddings, embeddingsPath, dimension);
        const embeddingsSize = await getFileSizeBytes(embeddingsPath);
        totalBytes += embeddingsSize;
        endpointBytes += embeddingsSize;
        endpointLogger.success(
          `Generated ${embeddings.length} embeddings (${formatBytes(embeddingsSize)})`
        );
      }

      // 4. Generate Zod schemas (if enabled)
      if (opts.generateTypes && data.length > 0) {
        const typeName = endpointToTypeName(endpoint);
        const schema = generateZodSchema(typeName, data);
        const schemasDir = join('packages/shared/src/schemas');
        await mkdir(schemasDir, { recursive: true });
        const schemaPath = join(schemasDir, `${endpoint}.ts`);
        await atomicWrite(schemaPath, schema);
        endpointLogger.success(`Generated schema: ${typeName}Schema`);
      }

      // 5. Generate test fixtures (if enabled)
      if (opts.generateFixtures) {
        const fixturesDir = join('test/fixtures');
        await mkdir(fixturesDir, { recursive: true });
        const fixture = createFixture(data);
        const fixturePath = join(fixturesDir, `${endpoint}.json`);
        await atomicWrite(fixturePath, ensureTrailingNewline(JSON.stringify(fixture, null, 2)));
        endpointLogger.success(`Generated fixture with ${fixture.length} items`);
      }

      endpointLogger.success(`Endpoint total: ${formatBytes(endpointBytes)}`);
      results.push({ endpoint, success: true, itemCount: data.length });
    } catch (error) {
      const errorMessage = (error as Error).message;
      endpointLogger.error('Failed', { error: errorMessage });
      results.push({ endpoint, success: false, error: errorMessage });
      // Continue to next endpoint instead of throwing
    }
  }

  // Cleanup embedder resources to allow process exit
  await embedder.dispose();

  // Report summary
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    logger.error(`Cache update completed with ${failures.length} failure(s)`, {
      failed: failures.map(f => f.endpoint),
    });
  } else {
    logger.success(`Cache update complete (${formatBytes(totalBytes)} total)`);
  }

  return results;
}

function endpointToTypeName(endpoint: Endpoint): string {
  const names: Record<Endpoint, string> = {
    [Endpoint.ITEMS]: 'Item',
    [Endpoint.ARCS]: 'Arc',
    [Endpoint.QUESTS]: 'Quest',
    [Endpoint.TRADERS]: 'Trader',
    [Endpoint.EVENTS]: 'Event',
  };
  return names[endpoint];
}

// CLI entry when run directly
if (import.meta.main) {
  const config = new Config(process.env);
  const logger = new Logger(config);

  runCache(config, logger)
    .then(results => {
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Cache failed', { error: error.message });
      process.exit(1);
    });
}
