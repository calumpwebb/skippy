# Wave 4: MCP Server

**Prerequisites:** Wave 3 complete (search package functional)
**Outputs:** Working MCP server with 5 tools and glossary resource

---

## Task 4A: Server Scaffold

**Depends on:** Wave 3 complete
**Must complete FIRST in Wave 4** (all other 4B-4D tasks depend on this)
**Files Created:**
- `apps/mcp-server/src/server.ts`
- `apps/mcp-server/src/index.ts`
- `apps/mcp-server/test/server.test.ts`
- `apps/mcp-server/src/tools/registry.ts`
- `packages/shared/src/tools/base.ts`

### TDD Step 1: Write tests FIRST

Create `apps/mcp-server/test/server.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createServer, ServerContext } from '../src/server';
import { Config, Logger } from '@skippy/shared';

describe('createServer', () => {
  test('exports createServer function', () => {
    expect(typeof createServer).toBe('function');
  });

  test('creates server with context', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = { config, logger, dataDir: './data' };

    const server = createServer(context);

    expect(server).toBeDefined();
  });
});
```

Create `packages/shared/test/tools/base.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { BaseSearchParamsSchema, BaseSearchResultSchema } from '../../src/tools/base';
import { z } from 'zod';

describe('BaseSearchParamsSchema', () => {
  test('validates query as required string', () => {
    expect(() => BaseSearchParamsSchema.parse({})).toThrow();
    expect(() => BaseSearchParamsSchema.parse({ query: '' })).toThrow();

    const valid = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(valid.query).toBe('test');
  });

  test('fields is optional string array', () => {
    const withFields = BaseSearchParamsSchema.parse({
      query: 'test',
      fields: ['name', 'value'],
    });
    expect(withFields.fields).toEqual(['name', 'value']);

    const withoutFields = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(withoutFields.fields).toBeUndefined();
  });

  test('limit defaults to 5, max 20', () => {
    const defaultLimit = BaseSearchParamsSchema.parse({ query: 'test' });
    expect(defaultLimit.limit).toBe(5);

    const customLimit = BaseSearchParamsSchema.parse({ query: 'test', limit: 10 });
    expect(customLimit.limit).toBe(10);

    expect(() =>
      BaseSearchParamsSchema.parse({ query: 'test', limit: 25 })
    ).toThrow();
  });
});

describe('BaseSearchResultSchema', () => {
  test('creates result schema with item type', () => {
    const ItemSchema = z.object({ id: z.string(), name: z.string() });
    const ResultSchema = BaseSearchResultSchema(ItemSchema);

    const valid = ResultSchema.parse({
      results: [{ id: '1', name: 'Test' }],
      totalMatches: 1,
      query: 'test',
    });

    expect(valid.results).toHaveLength(1);
    expect(valid.totalMatches).toBe(1);
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test server
bun test base
```

**Expected:** Tests FAIL because files don't exist.

### TDD Step 3: Implement base schemas

Create `packages/shared/src/tools/base.ts`:

```typescript
import { z } from 'zod';

/** Base parameters shared by all search tools. */
export const BaseSearchParamsSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .describe('Natural language search query'),

  fields: z
    .array(z.string())
    .optional()
    .describe('Specific fields to return. Be token efficient - only request what you need.'),

  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of results (default: 5, max: 20)'),
});

export type BaseSearchParams = z.infer<typeof BaseSearchParamsSchema>;

/** Creates a result schema for search tools. */
export function BaseSearchResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    results: z.array(itemSchema),
    totalMatches: z.number(),
    query: z.string(),
  });
}

export type BaseSearchResult<T> = {
  results: T[];
  totalMatches: number;
  query: string;
};
```

Create `packages/shared/src/tools/index.ts`:

```typescript
export * from './base';
```

Update `packages/shared/src/index.ts` to add:

```typescript
export * from './tools';
```

### TDD Step 4: Implement server scaffold

Create `apps/mcp-server/src/server.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Config, Logger, ToolName } from '@skippy/shared';
import { toolRegistry } from './tools/registry';

export interface ServerContext {
  config: Config;
  logger: Logger;
  dataDir: string;
}

/** Creates and configures the MCP server. */
export function createServer(context: ServerContext): Server {
  const { logger } = context;

  const server = new Server(
    {
      name: 'arc-raiders-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing tools');
    return {
      tools: toolRegistry.getToolDefinitions(),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Tool called', { tool: name });

    const handler = toolRegistry.getHandler(name as ToolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await handler(args, context);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Listing resources');
    return {
      resources: [
        {
          uri: 'arc-raiders://glossary',
          name: 'Arc Raiders Glossary',
          description: 'Game terminology and definitions',
          mimeType: 'text/markdown',
        },
      ],
    };
  });

  // Read resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.info('Resource requested', { uri });

    if (uri === 'arc-raiders://glossary') {
      const glossary = await Bun.file('./data/glossary.md').text();
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: glossary }],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  return server;
}

/** Starts the MCP server with stdio transport. */
export async function startServer(context: ServerContext): Promise<void> {
  const server = createServer(context);
  const transport = new StdioServerTransport();

  context.logger.info('Starting MCP server...');
  await server.connect(transport);
  context.logger.success('MCP server running');
}
```

Create `apps/mcp-server/src/tools/registry.ts`:

```typescript
import { ToolName } from '@skippy/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseSearchParamsSchema } from '@skippy/shared';
import type { ServerContext } from '../server';

export type ToolHandler = (
  args: unknown,
  context: ServerContext
) => Promise<unknown>;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

class ToolRegistry {
  private handlers = new Map<ToolName, ToolHandler>();
  private schemas = new Map<ToolName, z.ZodType>();
  private descriptions = new Map<ToolName, string>();

  register(
    name: ToolName,
    description: string,
    schema: z.ZodType,
    handler: ToolHandler
  ): void {
    this.handlers.set(name, handler);
    this.schemas.set(name, schema);
    this.descriptions.set(name, description);
  }

  getHandler(name: ToolName): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const name of Object.values(ToolName)) {
      const schema = this.schemas.get(name);
      const description = this.descriptions.get(name);

      if (schema && description) {
        definitions.push({
          name,
          description,
          inputSchema: zodToJsonSchema(schema) as Record<string, unknown>,
        });
      }
    }

    return definitions;
  }
}

export const toolRegistry = new ToolRegistry();

// Placeholder registrations - will be replaced by actual handlers in 4B tasks
toolRegistry.register(
  ToolName.SEARCH_ITEMS,
  'Search for items by name, type, or description',
  BaseSearchParamsSchema,
  async () => ({ results: [], totalMatches: 0, query: '' })
);

toolRegistry.register(
  ToolName.SEARCH_ARCS,
  'Search for ARCs (enemies) by name or description',
  BaseSearchParamsSchema,
  async () => ({ results: [], totalMatches: 0, query: '' })
);

toolRegistry.register(
  ToolName.SEARCH_QUESTS,
  'Search for quests by name, objectives, or trader',
  BaseSearchParamsSchema,
  async () => ({ results: [], totalMatches: 0, query: '' })
);

toolRegistry.register(
  ToolName.SEARCH_TRADERS,
  'Search for traders and their inventories',
  BaseSearchParamsSchema,
  async () => ({ results: [], totalMatches: 0, query: '' })
);

toolRegistry.register(
  ToolName.GET_EVENTS,
  'Get current and upcoming game events',
  z.object({}),
  async () => ({ events: [], cachedAt: new Date().toISOString() })
);
```

Create `apps/mcp-server/src/index.ts`:

```typescript
import { Config, Logger } from '@skippy/shared';
import { startServer, ServerContext } from './server';

const config = new Config(process.env);
const logger = new Logger(config);

const context: ServerContext = {
  config,
  logger,
  dataDir: config.dataDir,
};

startServer(context).catch((error) => {
  logger.error('Server failed to start', { error: error.message });
  process.exit(1);
});
```

### TDD Step 5: Run tests - verify GREEN

```bash
bun test apps/mcp-server
bun test packages/shared
```

**Expected:** All tests PASS.

### Checkpoint 4A
- [ ] Tests pass
- [ ] `createServer` returns Server instance
- [ ] Tool registry has placeholder handlers
- [ ] Base schemas validate correctly

---

## Task 4B.1: search_items Handler

**Depends on:** 4A complete
**Can run parallel with:** 4B.2, 4B.3, 4B.4, 4B.5, 4C, 4D
**Files Created:**
- `apps/mcp-server/src/tools/handlers/search-items.ts`
- `apps/mcp-server/test/tools/search-items.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/mcp-server/test/tools/search-items.test.ts`:

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { searchItems, SearchItemsParams } from '../../src/tools/handlers/search-items';
import { Config, Logger } from '@skippy/shared';
import type { ServerContext } from '../../src/server';

describe('searchItems', () => {
  let context: ServerContext;

  beforeAll(() => {
    const config = new Config({});
    const logger = new Logger(config);
    context = { config, logger, dataDir: './test/fixtures' };
  });

  test('returns results matching query', async () => {
    const params: SearchItemsParams = {
      query: 'light stick',
      limit: 5,
    };

    const result = await searchItems(params, context);

    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('totalMatches');
    expect(result).toHaveProperty('query');
    expect(result.query).toBe('light stick');
  });

  test('respects limit parameter', async () => {
    const params: SearchItemsParams = {
      query: 'item',
      limit: 2,
    };

    const result = await searchItems(params, context);

    expect(result.results.length).toBeLessThanOrEqual(2);
  });

  test('extracts only requested fields', async () => {
    const params: SearchItemsParams = {
      query: 'test',
      fields: ['name', 'value'],
      limit: 1,
    };

    const result = await searchItems(params, context);

    if (result.results.length > 0) {
      const item = result.results[0];
      expect(item).toHaveProperty('name');
      // Should not have fields we didn't ask for
      expect(Object.keys(item).every(k => ['name', 'value'].includes(k))).toBe(true);
    }
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test search-items
```

**Expected:** Tests FAIL because handler doesn't exist.

### TDD Step 3: Implement search-items handler

Create directory: `mkdir -p apps/mcp-server/src/tools/handlers`

Create `apps/mcp-server/src/tools/handlers/search-items.ts`:

```typescript
import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint } from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings, loadIndex } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';

export const SearchItemsParamsSchema = BaseSearchParamsSchema.extend({
  // Item-specific extensions can be added here
});

export type SearchItemsParams = z.infer<typeof SearchItemsParamsSchema>;

/** Extracts specified fields from an item. */
function extractFields(
  item: Record<string, unknown>,
  fields?: string[]
): Record<string, unknown> {
  if (!fields || fields.length === 0) {
    return item;
  }

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getNestedValue(item, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (current, key) => (current as Record<string, unknown>)?.[key],
    obj
  );
}

let searcherCache: HybridSearcher<Record<string, unknown>> | null = null;

async function getSearcher(context: ServerContext): Promise<HybridSearcher<Record<string, unknown>>> {
  if (searcherCache) return searcherCache;

  const dataPath = join(context.dataDir, 'items');

  // Load data
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  const items = await dataFile.json() as Record<string, unknown>[];

  // Load embeddings
  const embeddings = await loadEmbeddings(join(dataPath, 'embeddings.bin'), 384);

  // Create embedder
  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  searcherCache = new HybridSearcher(
    items,
    embeddings,
    embedder,
    Endpoint.ITEMS,
    ['name', 'description', 'item_type'],
    'id'
  );

  return searcherCache;
}

/** Searches for items using hybrid semantic + fuzzy search. */
export async function searchItems(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Record<string, unknown>>> {
  const validated = SearchItemsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  const searcher = await getSearcher(context);
  const results = await searcher.search(query, limit);

  const extracted = results.map(item => extractFields(item, fields));

  return {
    results: extracted,
    totalMatches: extracted.length,
    query,
  };
}
```

### TDD Step 4: Update registry

Update `apps/mcp-server/src/tools/registry.ts` to use real handler:

```typescript
import { searchItems, SearchItemsParamsSchema } from './handlers/search-items';

// Replace placeholder with real handler
toolRegistry.register(
  ToolName.SEARCH_ITEMS,
  'Search for items by name, type, or description',
  SearchItemsParamsSchema,
  searchItems
);
```

### TDD Step 5: Run tests - verify GREEN

```bash
bun test search-items
```

**Expected:** All tests PASS.

### Checkpoint 4B.1
- [ ] Tests pass
- [ ] Handler validates input with Zod
- [ ] Field extraction works
- [ ] Returns correct result shape

---

## Tasks 4B.2-4B.5: Remaining Search Handlers

**Pattern:** Each follows the EXACT same pattern as 4B.1

### Task 4B.2: search_arcs Handler
- Copy pattern from `search-items.ts`
- Change: `Endpoint.ARCS`, data path `arcs/`, fuzzy keys `['name', 'description']`
- File: `apps/mcp-server/src/tools/handlers/search-arcs.ts`

### Task 4B.3: search_quests Handler
- Copy pattern from `search-items.ts`
- Change: `Endpoint.QUESTS`, data path `quests/`, fuzzy keys `['name', 'trader_name']`
- File: `apps/mcp-server/src/tools/handlers/search-quests.ts`

### Task 4B.4: search_traders Handler
- Copy pattern from `search-items.ts`
- Change: `Endpoint.TRADERS`, data path `traders/`, fuzzy keys `['name']`
- File: `apps/mcp-server/src/tools/handlers/search-traders.ts`

### Task 4B.5: get_events Handler

Different pattern - no search, just returns data:

Create `apps/mcp-server/src/tools/handlers/get-events.ts`:

```typescript
import { z } from 'zod';
import { join } from 'node:path';
import type { ServerContext } from '../../server';

export const GetEventsParamsSchema = z.object({});

export type GetEventsParams = z.infer<typeof GetEventsParamsSchema>;

export interface GetEventsResult {
  events: Record<string, unknown>[];
  cachedAt: string;
}

/** Returns current game events. */
export async function getEvents(
  _params: unknown,
  context: ServerContext
): Promise<GetEventsResult> {
  const dataPath = join(context.dataDir, 'events', 'data.json');
  const file = Bun.file(dataPath);

  const events = await file.json() as Record<string, unknown>[];

  return {
    events,
    cachedAt: new Date().toISOString(),
  };
}
```

---

## Task 4C: Glossary Resource

**Depends on:** 4A complete
**Can run parallel with:** 4B.x, 4D
**Files Created:**
- `apps/mcp-server/src/resources/glossary.ts`
- `data/glossary.md` (copy from existing doc)

### Step 1: Copy existing glossary

```bash
cp docs/arc-raiders-introduction-glossary.md data/glossary.md
```

### Step 2: Resource already handled in server.ts

The glossary resource handler is already in the server scaffold (4A). Verify it works:

```bash
# Test by running server and checking resources
bun run apps/mcp-server/src/index.ts
```

### Checkpoint 4C
- [ ] `data/glossary.md` exists
- [ ] Server lists glossary in resources
- [ ] Resource content returns markdown

---

## Task 4D: Logging Middleware

**Depends on:** 4A complete
**Can run parallel with:** 4B.x, 4C
**Files Created:**
- `apps/mcp-server/src/middleware/logging.ts`
- `apps/mcp-server/test/middleware/logging.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/mcp-server/test/middleware/logging.test.ts`:

```typescript
import { describe, test, expect, vi } from 'vitest';
import { withLogging } from '../../src/middleware/logging';
import { Config, Logger } from '@skippy/shared';

describe('withLogging', () => {
  test('logs tool call start and completion', async () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const logger = new Logger(config);
    const infoSpy = vi.spyOn(logger, 'info');
    const successSpy = vi.spyOn(logger, 'success');

    const result = await withLogging(logger, 'test_tool', { query: 'test' }, async () => {
      return { result: 'ok' };
    });

    expect(infoSpy).toHaveBeenCalledWith('Tool called', expect.any(Object));
    expect(successSpy).toHaveBeenCalledWith('Tool completed', expect.any(Object));
    expect(result).toEqual({ result: 'ok' });
  });

  test('logs errors and re-throws', async () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const logger = new Logger(config);
    const errorSpy = vi.spyOn(logger, 'error');

    await expect(
      withLogging(logger, 'test_tool', {}, async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    expect(errorSpy).toHaveBeenCalledWith('Tool failed', expect.any(Object));
  });

  test('includes duration in logs', async () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const logger = new Logger(config);
    const successSpy = vi.spyOn(logger, 'success');

    await withLogging(logger, 'test_tool', {}, async () => {
      return {};
    });

    expect(successSpy).toHaveBeenCalledWith(
      'Tool completed',
      expect.objectContaining({ duration: expect.any(Number) })
    );
  });
});
```

### TDD Step 2: Implement logging middleware

Create `apps/mcp-server/src/middleware/logging.ts`:

```typescript
import { Logger } from '@skippy/shared';

/** Wraps a tool handler with logging. */
export async function withLogging<T>(
  logger: Logger,
  toolName: string,
  params: unknown,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const toolLogger = logger.child({ tool: toolName });

  toolLogger.info('Tool called', { params });

  try {
    const result = await handler();
    const duration = Math.round(performance.now() - startTime);

    toolLogger.success('Tool completed', { duration });

    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    toolLogger.error('Tool failed', {
      error: (error as Error).message,
      duration,
    });
    throw error;
  }
}
```

### TDD Step 3: Run tests - verify GREEN

```bash
bun test logging
```

**Expected:** All tests PASS.

### Checkpoint 4D
- [ ] Tests pass
- [ ] Logging includes tool name, params, duration
- [ ] Errors are logged before re-throwing

---

## Wave 4 Complete Checklist

Before starting Wave 5, verify ALL:

- [ ] `bun test apps/mcp-server` - all tests pass
- [ ] MCP server starts: `bun run apps/mcp-server/src/index.ts`
- [ ] All 5 tools registered and callable
- [ ] Glossary resource returns markdown
- [ ] Logging middleware wraps tool calls
- [ ] Can test with MCP Inspector:
  ```bash
  npx @modelcontextprotocol/inspector bun run apps/mcp-server/src/index.ts
  ```

**Wave 4 is DONE. Proceed to Wave 5.**
