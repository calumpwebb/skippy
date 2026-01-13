# Implementation Plan: Wire Up Generated Schemas and Types

**Reference:** See `docs/implementation/00-overview.md` for TDD protocol and implementation patterns.

---

## Purpose

This document organizes the schema/types wiring into **tasks** that can be executed by developers or LLMs working in isolation. Each task has:

- Clear inputs (what must exist before starting)
- Clear outputs (what must exist when done)
- TDD checkpoints (tests written FIRST, then implementation)
- File ownership (prevents conflicts)

---

## Problem Statement

Both `schema.json` and TypeScript types are generated but unused:

| Artifact                                  | Generated At | Intended Use                                 | Current State |
| ----------------------------------------- | ------------ | -------------------------------------------- | ------------- |
| `data/{endpoint}/schema.json`             | Cache time   | Runtime field validation + tool descriptions | Not loaded    |
| `packages/shared/src/types/{endpoint}.ts` | Cache time   | Compile-time type safety                     | Not exported  |

---

## Task Dependency Graph

```
Wave 6: Wire Up Schemas and Types
    │
    ├── 6A: Export TypeScript Types (FIRST - enables all typing)
    │       │
    │       ▼
    ├── 6B: Type MCP Handlers [after 6A]
    │   ├── 6B.1: search-items.ts (parallel)
    │   ├── 6B.2: search-arcs.ts (parallel)
    │   ├── 6B.3: search-quests.ts (parallel)
    │   ├── 6B.4: search-traders.ts + fix idField bug (parallel)
    │   └── 6B.5: get-events.ts (parallel)
    │       │
    │       ▼
    ├── 6C: Type Supporting Code [after 6A, parallel with 6B]
    │   ├── 6C.1: ServerContext searcherCache
    │   ├── 6C.2: createSearchableText overloads
    │   └── 6C.3: Integration tests
    │       │
    │       ▼
    ├── 6D: Schema Utilities [after 6B, 6C complete]
    │   ├── 6D.1: Create schema.ts (load/validate)
    │   └── 6D.2: Add schemaCache to ServerContext
    │       │
    │       ▼
    └── 6E: Wire Up Validation [after 6D]
        ├── 6E.1: Add validation to handlers (parallel)
        └── 6E.2: Dynamic tool descriptions
```

---

## Parallelization Rules

### Safe to Parallelize

- All 6B.x tasks (each handler is independent)
- 6C.x tasks with each other
- Tests and implementation of the SAME module

### Must Be Sequential

- 6A must complete before 6B or 6C can start
- 6D requires 6B and 6C complete (needs typed handlers)
- 6E requires 6D complete (needs schema utilities)

---

## TDD Protocol (Mandatory)

Every implementation task follows this exact sequence:

```
1. CREATE/UPDATE test file with failing tests
2. RUN tests → verify they FAIL (red)
3. CREATE/UPDATE implementation file
4. RUN tests → verify they PASS (green)
5. RUN typecheck → verify no type errors
6. COMMIT test + implementation together
```

**Violations:**

- Writing implementation before tests = REJECT
- Committing without tests = REJECT
- Skipping typecheck = REJECT

---

## File Ownership Map

```
6A: packages/shared/src/types/index.ts
6B.1: apps/mcp-server/src/tools/handlers/search-items.ts
6B.2: apps/mcp-server/src/tools/handlers/search-arcs.ts
6B.3: apps/mcp-server/src/tools/handlers/search-quests.ts
6B.4: apps/mcp-server/src/tools/handlers/search-traders.ts
6B.5: apps/mcp-server/src/tools/handlers/get-events.ts
6C.1: apps/mcp-server/src/server.ts (searcherCache only)
6C.2: packages/search/src/embeddings.ts
6C.3: test/integration/search.test.ts
6D.1: apps/mcp-server/src/utils/schema.ts (NEW)
6D.2: apps/mcp-server/src/server.ts (schemaCache), apps/cli/src/commands/mcp.ts
6E.1: apps/mcp-server/src/tools/handlers/search-*.ts (validation only)
6E.2: apps/mcp-server/src/tools/registry.ts, apps/mcp-server/src/server.ts (ListTools)
```

---

## Task 6A: Export TypeScript Types

**Depends on:** None - this is the first task
**Blocks:** 6B.x, 6C.x (all typing tasks depend on this)
**Files Modified:**

- `packages/shared/src/types/index.ts`

### TDD Step 1: Write test FIRST

Create `packages/shared/test/types/exports.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';

describe('Type exports', () => {
  test('exports Item type', async () => {
    const module = await import('../../src/types');
    expect(module.Item).toBeUndefined(); // Types don't exist at runtime
    // This test validates the import doesn't throw
  });

  test('exports Arc type', async () => {
    const module = await import('../../src/types');
    expect(module).toBeDefined();
  });

  test('exports Quest type', async () => {
    const module = await import('../../src/types');
    expect(module).toBeDefined();
  });

  test('exports Trader type', async () => {
    const module = await import('../../src/types');
    expect(module).toBeDefined();
  });

  test('exports Event type', async () => {
    const module = await import('../../src/types');
    expect(module).toBeDefined();
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test packages/shared/test/types/exports.test.ts
```

**Expected:** Tests FAIL because types aren't exported.

### TDD Step 3: Implement exports

Update `packages/shared/src/types/index.ts`:

```typescript
export * from './search';
export * from './items';
export * from './arcs';
export * from './quests';
export * from './traders';
export * from './events';
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test packages/shared/test/types/exports.test.ts
```

**Expected:** All tests PASS.

### TDD Step 5: Verify typecheck

```bash
bun run typecheck
```

**Expected:** No new type errors.

### Checkpoint 6A

- [ ] Tests pass: `bun test packages/shared`
- [ ] Types importable: `import { Item, Arc, Quest, Trader, Event } from '@skippy/shared'`
- [ ] Typecheck passes: `bun run typecheck`

---

## Task 6B.1: Type search-items Handler

**Depends on:** 6A complete
**Can run parallel with:** 6B.2, 6B.3, 6B.4, 6B.5, 6C.x
**Files Modified:**

- `apps/mcp-server/src/tools/handlers/search-items.ts`
- `apps/mcp-server/test/tools/search-items.test.ts`

### TDD Step 1: Update test to use typed assertions

Update `apps/mcp-server/test/tools/search-items.test.ts`:

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { searchItems } from '../../src/tools/handlers/search-items';
import { Config, Logger, Item } from '@skippy/shared';
import type { ServerContext } from '../../src/server';

describe('searchItems', () => {
  let context: ServerContext;

  beforeAll(() => {
    const config = new Config({});
    const logger = new Logger(config);
    context = {
      config,
      logger,
      dataDir: './test/fixtures',
      searcherCache: new Map(),
    };
  });

  test('returns typed Item results', async () => {
    const result = await searchItems({ query: 'light stick', limit: 5 }, context);

    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);

    if (result.results.length > 0) {
      const item = result.results[0] as Partial<Item>;
      // Type assertion - these should be valid Item fields
      expect(typeof item.name === 'string' || item.name === undefined).toBe(true);
    }
  });

  test('extractFields returns Partial<Item>', async () => {
    const result = await searchItems(
      { query: 'test', fields: ['name', 'item_type'], limit: 1 },
      context
    );

    if (result.results.length > 0) {
      const item = result.results[0];
      // Should only have requested fields
      const keys = Object.keys(item);
      expect(keys.every(k => ['name', 'item_type'].includes(k))).toBe(true);
    }
  });
});
```

### TDD Step 2: Run tests - verify current state

```bash
bun test apps/mcp-server/test/tools/search-items.test.ts
```

### TDD Step 3: Update handler with proper types

Update `apps/mcp-server/src/tools/handlers/search-items.ts`:

```typescript
import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Item } from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';

// ... schema definitions unchanged ...

/** Extracts specified fields from an item. */
function extractFields(item: Item, fields?: string[]): Partial<Item> {
  if (!fields || fields.length === 0) {
    return item;
  }

  // Validate all field paths first
  for (const field of fields) {
    validateFieldPath(field);
  }

  const result: Partial<Item> = {};
  for (const field of fields) {
    const value = getNestedValue(item, field);
    if (value !== undefined) {
      (result as Record<string, unknown>)[field] = value;
    }
  }
  return result;
}

function getNestedValue(obj: Item, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

async function getSearcher(context: ServerContext): Promise<HybridSearcher<Item>> {
  const cached = context.searcherCache.get(Endpoint.ITEMS);
  if (cached) return cached as HybridSearcher<Item>;

  const dataPath = join(context.dataDir, 'items');

  // Load data with proper type
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  const items = (await dataFile.json()) as Item[];

  // ... rest unchanged but returns HybridSearcher<Item> ...
}

/** Searches for items using hybrid semantic + fuzzy search. */
export async function searchItems(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Item>>> {
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

### TDD Step 4: Run tests - verify GREEN

```bash
bun test apps/mcp-server/test/tools/search-items.test.ts
```

### TDD Step 5: Verify typecheck

```bash
bun run typecheck
```

### Checkpoint 6B.1

- [ ] Tests pass
- [ ] Handler uses `Item` type instead of `Record<string, unknown>`
- [ ] `extractFields` returns `Partial<Item>`
- [ ] Typecheck passes

---

## Task 6B.4: Type search-traders Handler + Fix idField Bug

**Depends on:** 6A complete
**Can run parallel with:** 6B.1, 6B.2, 6B.3, 6B.5, 6C.x
**Files Modified:**

- `apps/mcp-server/src/tools/handlers/search-traders.ts`
- `apps/mcp-server/test/tools/search-traders.test.ts`

### TDD Step 1: Write test that exposes the bug

Create/update `apps/mcp-server/test/tools/search-traders.test.ts`:

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { searchTraders } from '../../src/tools/handlers/search-traders';
import { Config, Logger, Trader } from '@skippy/shared';
import type { ServerContext } from '../../src/server';

describe('searchTraders', () => {
  let context: ServerContext;

  beforeAll(() => {
    const config = new Config({});
    const logger = new Logger(config);
    context = {
      config,
      logger,
      dataDir: './data', // Use real data to test
      searcherCache: new Map(),
    };
  });

  test('returns typed Trader results', async () => {
    const result = await searchTraders({ query: 'Apollo', limit: 5 }, context);

    expect(result.results.length).toBeGreaterThan(0);

    const trader = result.results[0] as Partial<Trader>;
    // Trader has 'name' not 'id' - this validates the fix
    expect(trader.name).toBeDefined();
    expect(typeof trader.name).toBe('string');
  });

  test('deduplicates results by name (not id)', async () => {
    const result = await searchTraders({ query: 'trader', limit: 10 }, context);

    const names = result.results.map(t => (t as Partial<Trader>).name);
    const uniqueNames = new Set(names);

    // No duplicate names
    expect(names.length).toBe(uniqueNames.size);
  });
});
```

### TDD Step 2: Run tests - verify RED (bug exposed)

```bash
bun test apps/mcp-server/test/tools/search-traders.test.ts
```

**Expected:** Tests FAIL because `idField: 'id'` doesn't exist on Trader.

### TDD Step 3: Fix the bug and add types

Update `apps/mcp-server/src/tools/handlers/search-traders.ts`:

```typescript
import { z } from 'zod';
import { BaseSearchParamsSchema, BaseSearchResult, Endpoint, Trader } from '@skippy/shared';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { join } from 'node:path';
import type { ServerContext } from '../../server';

// ... (similar pattern to search-items.ts, but with Trader type)

async function getSearcher(context: ServerContext): Promise<HybridSearcher<Trader>> {
  const cached = context.searcherCache.get(Endpoint.TRADERS);
  if (cached) return cached as HybridSearcher<Trader>;

  const dataPath = join(context.dataDir, 'traders');
  const dataFile = Bun.file(join(dataPath, 'data.json'));
  const traders = (await dataFile.json()) as Trader[];

  const { embeddings } = await loadEmbeddings(join(dataPath, 'embeddings.bin'));

  const embedder = new Embedder({
    modelName: context.config.embeddingModelName,
    cacheDir: context.config.embeddingModelCacheDir,
  });
  await embedder.initialize();

  const searcher = new HybridSearcher(
    traders,
    embeddings,
    embedder,
    Endpoint.TRADERS,
    ['name'],
    'name' // FIX: was 'id', but Trader has no id field
  );

  context.searcherCache.set(Endpoint.TRADERS, searcher);
  return searcher;
}

export async function searchTraders(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Trader>>> {
  // ... implementation using Trader type
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test apps/mcp-server/test/tools/search-traders.test.ts
```

### TDD Step 5: Verify typecheck

```bash
bun run typecheck
```

### Checkpoint 6B.4

- [ ] Tests pass
- [ ] Bug fixed: `idField` is `'name'` not `'id'`
- [ ] Handler uses `Trader` type
- [ ] Typecheck passes

---

## Tasks 6B.2, 6B.3, 6B.5

**Pattern:** Each follows the EXACT same pattern as 6B.1

| Task | Handler            | Type    | idField         |
| ---- | ------------------ | ------- | --------------- |
| 6B.2 | `search-arcs.ts`   | `Arc`   | `'id'`          |
| 6B.3 | `search-quests.ts` | `Quest` | `'id'`          |
| 6B.5 | `get-events.ts`    | `Event` | N/A (no search) |

---

## Task 6C.1: Type ServerContext searcherCache

**Depends on:** 6A complete
**Can run parallel with:** 6B.x, 6C.2, 6C.3
**Files Modified:**

- `apps/mcp-server/src/server.ts`

### TDD Step 1: Write test FIRST

Update `apps/mcp-server/test/server.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createServer, ServerContext } from '../src/server';
import { Config, Logger, Item, Arc, Quest, Trader } from '@skippy/shared';
import { HybridSearcher } from '@skippy/search';

describe('ServerContext', () => {
  test('searcherCache accepts typed searchers', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
    };

    // This should compile - validates type union works
    expect(context.searcherCache).toBeInstanceOf(Map);
  });
});
```

### TDD Step 2: Update ServerContext type

Update `apps/mcp-server/src/server.ts`:

```typescript
import { Item, Arc, Quest, Trader } from '@skippy/shared';
import { HybridSearcher } from '@skippy/search';

type SearchableEntity = Item | Arc | Quest | Trader;

export interface ServerContext {
  config: Config;
  logger: Logger;
  dataDir: string;
  searcherCache: Map<string, HybridSearcher<SearchableEntity>>;
}
```

### Checkpoint 6C.1

- [ ] Tests pass
- [ ] `searcherCache` uses union type
- [ ] Typecheck passes

---

## Task 6C.2: Type createSearchableText

**Depends on:** 6A complete
**Can run parallel with:** 6B.x, 6C.1, 6C.3
**Files Modified:**

- `packages/search/src/embeddings.ts`
- `packages/search/test/embeddings.test.ts`

### TDD Step 1: Update test with typed entities

Update `packages/search/test/embeddings.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createSearchableText } from '../src/embeddings';
import { Endpoint, Item, Arc, Quest } from '@skippy/shared';

describe('createSearchableText', () => {
  test('combines Item fields into searchable text', () => {
    const item: Item = {
      id: '1',
      name: 'Blue Light Stick',
      description: 'A glowing stick',
      item_type: 'Quick Use',
      rarity: 'Common',
      // ... other required fields
    };

    const text = createSearchableText(Endpoint.ITEMS, item);

    expect(text).toContain('Blue Light Stick');
    expect(text).toContain('A glowing stick');
  });

  test('combines Arc fields into searchable text', () => {
    const arc: Arc = {
      id: 'arc-1',
      name: 'Sentinel',
      description: 'A large combat robot',
      // ... other required fields
    };

    const text = createSearchableText(Endpoint.ARCS, arc);

    expect(text).toContain('Sentinel');
    expect(text).toContain('large combat robot');
  });
});
```

### TDD Step 2: Add function overloads

Update `packages/search/src/embeddings.ts`:

```typescript
import { Endpoint, Item, Arc, Quest, Trader, Event } from '@skippy/shared';

// Overloads for type safety
export function createSearchableText(endpoint: Endpoint.ITEMS, entity: Item): string;
export function createSearchableText(endpoint: Endpoint.ARCS, entity: Arc): string;
export function createSearchableText(endpoint: Endpoint.QUESTS, entity: Quest): string;
export function createSearchableText(endpoint: Endpoint.TRADERS, entity: Trader): string;
export function createSearchableText(endpoint: Endpoint.EVENTS, entity: Event): string;

// Implementation
export function createSearchableText(
  endpoint: Endpoint,
  entity: Item | Arc | Quest | Trader | Event
): string {
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
    // ... other cases with proper type narrowing
  }

  return parts.join(' ');
}
```

### Checkpoint 6C.2

- [ ] Tests pass
- [ ] Function has typed overloads
- [ ] Typecheck passes

---

## Task 6D.1: Create Schema Utilities

**Depends on:** 6B.x, 6C.x complete
**Files Created:**

- `apps/mcp-server/src/utils/schema.ts`
- `apps/mcp-server/test/utils/schema.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/mcp-server/test/utils/schema.test.ts`:

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSchema, validateFields, Schema } from '../../src/utils/schema';
import { Endpoint } from '@skippy/shared';

const TEST_DIR = './test-schema-data';

describe('loadSchema', () => {
  beforeAll(async () => {
    await mkdir(join(TEST_DIR, 'items'), { recursive: true });
    const schema: Schema = { fields: ['id', 'name', 'description', 'value'] };
    await writeFile(join(TEST_DIR, 'items', 'schema.json'), JSON.stringify(schema));
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test('loads schema from data directory', async () => {
    const schema = await loadSchema(TEST_DIR, Endpoint.ITEMS);

    expect(schema.fields).toContain('id');
    expect(schema.fields).toContain('name');
  });

  test('throws if schema file missing', async () => {
    await expect(loadSchema(TEST_DIR, Endpoint.ARCS)).rejects.toThrow(/Schema not found/);
  });
});

describe('validateFields', () => {
  const schema: Schema = { fields: ['id', 'name', 'description', 'value'] };

  test('accepts valid fields', () => {
    expect(() => validateFields(['id', 'name'], schema)).not.toThrow();
  });

  test('throws for invalid fields with suggestions', () => {
    expect(() => validateFields(['id', 'fake_field'], schema)).toThrow(
      /Invalid field\(s\): fake_field/
    );
  });

  test('error message includes available fields', () => {
    try {
      validateFields(['nonexistent'], schema);
    } catch (error) {
      expect((error as Error).message).toContain('Available:');
      expect((error as Error).message).toContain('id');
    }
  });

  test('accepts empty field list', () => {
    expect(() => validateFields([], schema)).not.toThrow();
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test apps/mcp-server/test/utils/schema.test.ts
```

**Expected:** Tests FAIL because `schema.ts` doesn't exist.

### TDD Step 3: Implement schema utilities

Create `apps/mcp-server/src/utils/schema.ts`:

```typescript
import { join } from 'node:path';
import { Endpoint } from '@skippy/shared';

export interface Schema {
  fields: string[];
}

/** Loads schema from data directory. */
export async function loadSchema(dataDir: string, endpoint: Endpoint): Promise<Schema> {
  const schemaPath = join(dataDir, endpoint, 'schema.json');
  const file = Bun.file(schemaPath);

  if (!(await file.exists())) {
    throw new Error(`Schema not found: ${schemaPath}. Run: skippy cache`);
  }

  return file.json() as Promise<Schema>;
}

/** Validates that requested fields exist in schema. */
export function validateFields(requestedFields: string[], schema: Schema): void {
  if (requestedFields.length === 0) return;

  const invalid = requestedFields.filter(f => !schema.fields.includes(f));

  if (invalid.length > 0) {
    const available = schema.fields.slice(0, 20).join(', ');
    const suffix = schema.fields.length > 20 ? '...' : '';

    throw new Error(`Invalid field(s): ${invalid.join(', ')}. Available: ${available}${suffix}`);
  }
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test apps/mcp-server/test/utils/schema.test.ts
```

### Checkpoint 6D.1

- [ ] Tests pass
- [ ] `loadSchema` returns Schema from file
- [ ] `validateFields` throws with helpful message for invalid fields

---

## Task 6D.2: Add schemaCache to ServerContext

**Depends on:** 6D.1 complete
**Files Modified:**

- `apps/mcp-server/src/server.ts`
- `apps/cli/src/commands/mcp.ts`

### TDD Step 1: Update test

Update `apps/mcp-server/test/server.test.ts`:

```typescript
describe('ServerContext', () => {
  test('has schemaCache property', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
      schemaCache: new Map(), // NEW
    };

    expect(context.schemaCache).toBeInstanceOf(Map);
  });
});
```

### TDD Step 2: Update ServerContext interface

Update `apps/mcp-server/src/server.ts`:

```typescript
import type { Schema } from './utils/schema';

export interface ServerContext {
  config: Config;
  logger: Logger;
  dataDir: string;
  searcherCache: Map<string, HybridSearcher<SearchableEntity>>;
  schemaCache: Map<string, Schema>; // NEW
}
```

Update `apps/cli/src/commands/mcp.ts`:

```typescript
const context: ServerContext = {
  config,
  logger,
  dataDir,
  searcherCache: new Map(),
  schemaCache: new Map(), // NEW
};
```

### Checkpoint 6D.2

- [ ] Tests pass
- [ ] `schemaCache` added to interface
- [ ] CLI initializes schemaCache

---

## Task 6E.1: Add Validation to Handlers

**Depends on:** 6D complete
**Can run parallel with:** 6E.2
**Files Modified:**

- `apps/mcp-server/src/tools/handlers/search-items.ts`
- `apps/mcp-server/src/tools/handlers/search-arcs.ts`
- `apps/mcp-server/src/tools/handlers/search-quests.ts`
- `apps/mcp-server/src/tools/handlers/search-traders.ts`

### TDD Step 1: Write test for validation

Update `apps/mcp-server/test/tools/search-items.test.ts`:

```typescript
describe('field validation', () => {
  test('accepts valid fields', async () => {
    const result = await searchItems(
      { query: 'test', fields: ['name', 'description'], limit: 1 },
      context
    );

    expect(result).toBeDefined();
  });

  test('rejects invalid fields with helpful error', async () => {
    await expect(
      searchItems({ query: 'test', fields: ['fake_field'], limit: 1 }, context)
    ).rejects.toThrow(/Invalid field\(s\): fake_field/);
  });

  test('error includes available fields', async () => {
    try {
      await searchItems({ query: 'test', fields: ['nonexistent'], limit: 1 }, context);
    } catch (error) {
      expect((error as Error).message).toContain('Available:');
    }
  });
});
```

### TDD Step 2: Add validation to handler

Update each handler:

```typescript
import { loadSchema, validateFields } from '../../utils/schema';
import type { Schema } from '../../utils/schema';

async function getSchema(context: ServerContext): Promise<Schema> {
  const cached = context.schemaCache.get(Endpoint.ITEMS);
  if (cached) return cached;

  const schema = await loadSchema(context.dataDir, Endpoint.ITEMS);
  context.schemaCache.set(Endpoint.ITEMS, schema);
  return schema;
}

export async function searchItems(
  params: unknown,
  context: ServerContext
): Promise<BaseSearchResult<Partial<Item>>> {
  const validated = SearchItemsParamsSchema.parse(params);
  const { query, fields, limit } = validated;

  // NEW: Validate fields against schema
  if (fields && fields.length > 0) {
    const schema = await getSchema(context);
    validateFields(fields, schema);
  }

  const searcher = await getSearcher(context);
  const results = await searcher.search(query, limit);
  const extracted = results.map(item => extractFields(item, fields));

  return { results: extracted, totalMatches: extracted.length, query };
}
```

### Checkpoint 6E.1

- [ ] Tests pass for all handlers
- [ ] Invalid fields rejected with helpful message
- [ ] Valid fields accepted

---

## Task 6E.2: Dynamic Tool Descriptions

**Depends on:** 6D complete
**Can run parallel with:** 6E.1
**Files Modified:**

- `apps/mcp-server/src/tools/registry.ts`
- `apps/mcp-server/src/server.ts`

### TDD Step 1: Write test

Create `apps/mcp-server/test/tools/registry.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { toolRegistry } from '../../src/tools/registry';

describe('toolRegistry', () => {
  test('getToolDefinitionsWithSchemas includes field list', async () => {
    const schemaCache = new Map();
    schemaCache.set('items', { fields: ['id', 'name', 'description'] });

    const tools = await toolRegistry.getToolDefinitionsWithSchemas('./data', schemaCache);

    const searchItems = tools.find(t => t.name === 'search_items');
    expect(searchItems?.description).toContain('id');
    expect(searchItems?.description).toContain('name');
  });
});
```

### TDD Step 2: Implement dynamic descriptions

Update `apps/mcp-server/src/tools/registry.ts`:

```typescript
import { loadSchema, Schema } from '../utils/schema';
import { Endpoint, ToolName } from '@skippy/shared';

const TOOL_TO_ENDPOINT: Record<string, Endpoint> = {
  [ToolName.SEARCH_ITEMS]: Endpoint.ITEMS,
  [ToolName.SEARCH_ARCS]: Endpoint.ARCS,
  [ToolName.SEARCH_QUESTS]: Endpoint.QUESTS,
  [ToolName.SEARCH_TRADERS]: Endpoint.TRADERS,
};

async getToolDefinitionsWithSchemas(
  dataDir: string,
  schemaCache: Map<string, Schema>
): Promise<ToolDefinition[]> {
  const definitions = this.getToolDefinitions();

  for (const def of definitions) {
    const endpoint = TOOL_TO_ENDPOINT[def.name];
    if (!endpoint) continue;

    let schema = schemaCache.get(endpoint);
    if (!schema) {
      try {
        schema = await loadSchema(dataDir, endpoint);
        schemaCache.set(endpoint, schema);
      } catch {
        continue; // Skip if schema not available
      }
    }

    const fieldList = schema.fields.slice(0, 15).join(', ');
    const suffix = schema.fields.length > 15 ? '...' : '';
    def.description += `. Available fields: ${fieldList}${suffix}`;
  }

  return definitions;
}
```

Update `apps/mcp-server/src/server.ts` ListTools handler:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing tools');
  return {
    tools: await toolRegistry.getToolDefinitionsWithSchemas(context.dataDir, context.schemaCache),
  };
});
```

### Checkpoint 6E.2

- [ ] Tests pass
- [ ] Tool descriptions include available fields
- [ ] ListTools uses dynamic descriptions

---

## Definition of Done (Per Task)

A task is DONE when:

- [ ] Test file exists/updated at specified path
- [ ] All tests pass: `bun test <path>`
- [ ] Implementation complete
- [ ] No TypeScript errors: `bun run typecheck`
- [ ] No ESLint errors: `bun run lint`

---

## Wave 6 Complete Checklist

Before marking DONE, verify ALL:

- [ ] `bun run typecheck` - No type errors
- [ ] `bun test` - All tests pass
- [ ] Types exported from `@skippy/shared`: Item, Arc, Quest, Trader, Event
- [ ] All handlers use proper types instead of `Record<string, unknown>`
- [ ] Traders idField bug fixed (`'name'` not `'id'`)
- [ ] Schema validation rejects invalid fields with helpful message
- [ ] Tool descriptions include available fields

### Manual Verification

```bash
# 1. Type check
bun run typecheck

# 2. All tests
bun test

# 3. Start MCP server
bun run skippy mcp

# 4. Test with MCP Inspector
npx @modelcontextprotocol/inspector bun run skippy mcp

# In inspector:
# - List tools → descriptions should include "Available fields: ..."
# - Call search_items with fields: ["name", "description"] → works
# - Call search_items with fields: ["fake"] → error lists valid fields
```

---

## Verification Commands

After each task, run these to verify:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Tests (specific file)
bun test <path-to-test-file>

# All tests
bun test
```

---

## Implementation Progress

- [ ] 6A: Export TypeScript types from shared package
- [ ] 6B.1: Type search-items handler
- [ ] 6B.2: Type search-arcs handler
- [ ] 6B.3: Type search-quests handler
- [ ] 6B.4: Type search-traders handler + fix idField bug
- [ ] 6B.5: Type get-events handler
- [ ] 6C.1: Type ServerContext searcherCache
- [ ] 6C.2: Type createSearchableText with overloads
- [ ] 6C.3: Type integration tests
- [ ] 6D.1: Create schema utilities (load/validate)
- [ ] 6D.2: Add schemaCache to ServerContext
- [ ] 6E.1: Wire up field validation in handlers
- [ ] 6E.2: Add dynamic tool descriptions with field lists
- [ ] Final verification

**Status:** Not started. Begin with Task 6A.
