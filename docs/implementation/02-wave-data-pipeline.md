# Wave 2: Data Pipeline

**Prerequisites:** Wave 1 complete (monorepo setup, shared package working)
**Outputs:** Cache app that downloads data, generates schemas, types, and embeddings

---

## Task 2A: Download Module

**Depends on:** Wave 1 complete
**Can run parallel with:** 2B, 2C (test-only)
**Files Created:**
- `apps/cache/src/download.ts`
- `apps/cache/test/download.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/cache/test/download.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { downloadEndpoint, normalizeResponse, METAFORGE_BASE_URL } from '../src/download';
import { Endpoint } from '@skippy/shared';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('downloadEndpoint', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test('constructs correct URL for items endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await downloadEndpoint(Endpoint.ITEMS);

    expect(mockFetch).toHaveBeenCalledWith(
      `${METAFORGE_BASE_URL}/items`,
      expect.any(Object)
    );
  });

  test('constructs correct URL for arcs endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ arcs: [] }),
    });

    await downloadEndpoint(Endpoint.ARCS);

    expect(mockFetch).toHaveBeenCalledWith(
      `${METAFORGE_BASE_URL}/arcs`,
      expect.any(Object)
    );
  });

  test('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(downloadEndpoint(Endpoint.ITEMS)).rejects.toThrow('404');
  });

  test('returns parsed JSON data', async () => {
    const mockData = { items: [{ id: '1', name: 'Test Item' }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await downloadEndpoint(Endpoint.ITEMS);

    expect(result).toEqual(mockData);
  });
});

describe('normalizeResponse', () => {
  test('extracts items array from response', () => {
    const response = { items: [{ id: '1' }, { id: '2' }] };

    const normalized = normalizeResponse(Endpoint.ITEMS, response);

    expect(normalized).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('extracts arcs array from response', () => {
    const response = { arcs: [{ id: 'arc-1' }] };

    const normalized = normalizeResponse(Endpoint.ARCS, response);

    expect(normalized).toEqual([{ id: 'arc-1' }]);
  });

  test('extracts quests array from response', () => {
    const response = { quests: [{ id: 'quest-1' }] };

    const normalized = normalizeResponse(Endpoint.QUESTS, response);

    expect(normalized).toEqual([{ id: 'quest-1' }]);
  });

  test('extracts traders array from response', () => {
    const response = { traders: [{ id: 'trader-1' }] };

    const normalized = normalizeResponse(Endpoint.TRADERS, response);

    expect(normalized).toEqual([{ id: 'trader-1' }]);
  });

  test('extracts events from schedule response', () => {
    const response = { events_schedule: { events: [{ id: 'event-1' }] } };

    const normalized = normalizeResponse(Endpoint.EVENTS, response);

    expect(normalized).toEqual([{ id: 'event-1' }]);
  });

  test('returns empty array if key not found', () => {
    const response = { unexpected: 'data' };

    const normalized = normalizeResponse(Endpoint.ITEMS, response);

    expect(normalized).toEqual([]);
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
cd apps/cache
bun test
```

**Expected:** Tests FAIL because `download.ts` doesn't exist.

### TDD Step 3: Implement download.ts

Create `apps/cache/src/download.ts`:

```typescript
import { Endpoint } from '@skippy/shared';

export const METAFORGE_BASE_URL = 'https://metaforge.gg/api/arc-raiders';

/** Downloads data from a MetaForge API endpoint. */
export async function downloadEndpoint(endpoint: Endpoint): Promise<unknown> {
  const url = `${METAFORGE_BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Skippy/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${endpoint}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** Extracts the data array from API response wrapper. */
export function normalizeResponse(endpoint: Endpoint, response: unknown): unknown[] {
  if (typeof response !== 'object' || response === null) {
    return [];
  }

  const data = response as Record<string, unknown>;

  switch (endpoint) {
    case Endpoint.ITEMS:
      return Array.isArray(data.items) ? data.items : [];
    case Endpoint.ARCS:
      return Array.isArray(data.arcs) ? data.arcs : [];
    case Endpoint.QUESTS:
      return Array.isArray(data.quests) ? data.quests : [];
    case Endpoint.TRADERS:
      return Array.isArray(data.traders) ? data.traders : [];
    case Endpoint.EVENTS: {
      const schedule = data.events_schedule as Record<string, unknown> | undefined;
      return Array.isArray(schedule?.events) ? schedule.events : [];
    }
    default:
      return [];
  }
}

/** Downloads and normalizes data from an endpoint. */
export async function downloadAndNormalize(endpoint: Endpoint): Promise<unknown[]> {
  const raw = await downloadEndpoint(endpoint);
  return normalizeResponse(endpoint, raw);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test
```

**Expected:** All tests PASS.

### Checkpoint 2A
- [ ] Tests pass: `bun test apps/cache`
- [ ] `downloadEndpoint` fetches from correct URLs
- [ ] `normalizeResponse` extracts arrays correctly

---

## Task 2B: Schema Generator

**Depends on:** Wave 1 complete
**Can run parallel with:** 2A, 2C (after this)
**Files Created:**
- `apps/cache/src/generate-schema.ts`
- `apps/cache/test/generate-schema.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/cache/test/generate-schema.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { generateSchema, extractFieldPaths } from '../src/generate-schema';

describe('extractFieldPaths', () => {
  test('extracts top-level fields', () => {
    const obj = { name: 'Test', value: 100 };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('name');
    expect(paths).toContain('value');
  });

  test('extracts nested field paths with dot notation', () => {
    const obj = {
      name: 'Test',
      stat_block: {
        damage: 50,
        healing: 0,
      },
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('name');
    expect(paths).toContain('stat_block');
    expect(paths).toContain('stat_block.damage');
    expect(paths).toContain('stat_block.healing');
  });

  test('handles deeply nested objects', () => {
    const obj = {
      level1: {
        level2: {
          level3: 'deep',
        },
      },
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('level1');
    expect(paths).toContain('level1.level2');
    expect(paths).toContain('level1.level2.level3');
  });

  test('handles arrays by extracting element fields', () => {
    const obj = {
      items: [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ],
    };

    const paths = extractFieldPaths(obj);

    expect(paths).toContain('items');
    expect(paths).toContain('items.id');
    expect(paths).toContain('items.name');
  });

  test('returns empty array for null input', () => {
    const paths = extractFieldPaths(null);
    expect(paths).toEqual([]);
  });

  test('returns empty array for primitive input', () => {
    const paths = extractFieldPaths('string');
    expect(paths).toEqual([]);
  });
});

describe('generateSchema', () => {
  test('generates schema from array of objects', () => {
    const items = [
      { id: '1', name: 'Item 1', value: 100 },
      { id: '2', name: 'Item 2', value: 200, extra: 'field' },
    ];

    const schema = generateSchema(items);

    expect(schema.fields).toContain('id');
    expect(schema.fields).toContain('name');
    expect(schema.fields).toContain('value');
    expect(schema.fields).toContain('extra'); // Found in second item
  });

  test('returns sorted field list', () => {
    const items = [{ zebra: 1, alpha: 2, middle: 3 }];

    const schema = generateSchema(items);

    expect(schema.fields[0]).toBe('alpha');
    expect(schema.fields[1]).toBe('middle');
    expect(schema.fields[2]).toBe('zebra');
  });

  test('deduplicates fields across items', () => {
    const items = [
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
    ];

    const schema = generateSchema(items);

    expect(schema.fields.filter(f => f === 'name')).toHaveLength(1);
  });

  test('returns empty fields for empty array', () => {
    const schema = generateSchema([]);
    expect(schema.fields).toEqual([]);
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test generate-schema
```

**Expected:** Tests FAIL because `generate-schema.ts` doesn't exist.

### TDD Step 3: Implement generate-schema.ts

Create `apps/cache/src/generate-schema.ts`:

```typescript
export interface Schema {
  fields: string[];
}

/** Recursively extracts all field paths from an object. */
export function extractFieldPaths(obj: unknown, prefix: string = ''): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [];
  }

  if (Array.isArray(obj)) {
    // For arrays, extract paths from first non-null element
    const firstItem = obj.find(item => item !== null && item !== undefined);
    if (firstItem && typeof firstItem === 'object') {
      return extractFieldPaths(firstItem, prefix);
    }
    return [];
  }

  const paths: string[] = [];
  const record = obj as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);

    const value = record[key];
    if (value !== null && typeof value === 'object') {
      paths.push(...extractFieldPaths(value, fullPath));
    }
  }

  return paths;
}

/** Generates a schema from an array of objects. */
export function generateSchema(items: unknown[]): Schema {
  const allPaths = new Set<string>();

  for (const item of items) {
    const paths = extractFieldPaths(item);
    for (const path of paths) {
      allPaths.add(path);
    }
  }

  const fields = Array.from(allPaths).sort();

  return { fields };
}

/** Writes schema to a JSON file. */
export async function writeSchema(schema: Schema, outputPath: string): Promise<void> {
  const content = JSON.stringify(schema, null, 2);
  await Bun.write(outputPath, content);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test generate-schema
```

**Expected:** All tests PASS.

### Checkpoint 2B
- [ ] Tests pass
- [ ] `extractFieldPaths` handles nested objects
- [ ] `generateSchema` produces sorted, deduplicated field list

---

## Task 2C: Type Generator

**Depends on:** 2B complete (needs Schema type)
**Can run parallel with:** 2D (after 2A)
**Files Created:**
- `apps/cache/src/generate-types.ts`
- `apps/cache/test/generate-types.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/cache/test/generate-types.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { inferType, generateTypeScript } from '../src/generate-types';

describe('inferType', () => {
  test('infers string type', () => {
    expect(inferType('hello')).toBe('string');
  });

  test('infers number type', () => {
    expect(inferType(42)).toBe('number');
    expect(inferType(3.14)).toBe('number');
  });

  test('infers boolean type', () => {
    expect(inferType(true)).toBe('boolean');
    expect(inferType(false)).toBe('boolean');
  });

  test('infers null type', () => {
    expect(inferType(null)).toBe('null');
  });

  test('infers array type from elements', () => {
    expect(inferType(['a', 'b'])).toBe('string[]');
    expect(inferType([1, 2, 3])).toBe('number[]');
  });

  test('infers object type', () => {
    expect(inferType({ key: 'value' })).toBe('object');
  });

  test('infers unknown for empty array', () => {
    expect(inferType([])).toBe('unknown[]');
  });

  test('infers undefined type', () => {
    expect(inferType(undefined)).toBe('undefined');
  });
});

describe('generateTypeScript', () => {
  test('generates interface with simple fields', () => {
    const items = [{ id: '1', name: 'Test', value: 100 }];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('export interface Item');
    expect(ts).toContain('id: string');
    expect(ts).toContain('name: string');
    expect(ts).toContain('value: number');
  });

  test('generates interface with optional fields', () => {
    const items = [
      { id: '1', name: 'Test' },
      { id: '2', name: 'Test2', extra: 'field' },
    ];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('id: string');
    expect(ts).toContain('extra?: string'); // Optional because not in all items
  });

  test('generates nested interface for objects', () => {
    const items = [
      {
        id: '1',
        stat_block: { damage: 50, healing: 0 },
      },
    ];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('stat_block: ItemStatBlock');
    expect(ts).toContain('export interface ItemStatBlock');
    expect(ts).toContain('damage: number');
  });

  test('handles array fields', () => {
    const items = [
      { id: '1', tags: ['tag1', 'tag2'] },
    ];

    const ts = generateTypeScript('Item', items);

    expect(ts).toContain('tags: string[]');
  });

  test('returns empty string for empty items', () => {
    const ts = generateTypeScript('Item', []);
    expect(ts).toBe('');
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test generate-types
```

**Expected:** Tests FAIL because `generate-types.ts` doesn't exist.

### TDD Step 3: Implement generate-types.ts

Create `apps/cache/src/generate-types.ts`:

```typescript
/** Infers TypeScript type from a JavaScript value. */
export function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const elementType = inferType(value[0]);
    return `${elementType}[]`;
  }

  const type = typeof value;
  if (type === 'object') return 'object';
  return type;
}

interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
  nestedFields?: Map<string, FieldInfo>;
}

/** Analyzes items to determine field types and optionality. */
function analyzeFields(items: unknown[]): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();
  const itemCount = items.length;

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const existing = fields.get(key);

      if (!existing) {
        const info: FieldInfo = {
          name: key,
          type: inferType(value),
          optional: false,
        };

        // Handle nested objects
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          info.nestedFields = analyzeFields([value]);
        }

        fields.set(key, info);
      }
    }
  }

  // Mark fields as optional if not present in all items
  for (const [key, info] of fields) {
    let presentCount = 0;
    for (const item of items) {
      if (typeof item === 'object' && item !== null && key in item) {
        presentCount++;
      }
    }
    info.optional = presentCount < itemCount;
  }

  return fields;
}

/** Generates TypeScript interfaces from sample data. */
export function generateTypeScript(name: string, items: unknown[]): string {
  if (items.length === 0) return '';

  const fields = analyzeFields(items);
  const interfaces: string[] = [];

  // Generate nested interfaces first
  const nestedInterfaces: string[] = [];
  for (const [key, info] of fields) {
    if (info.nestedFields && info.nestedFields.size > 0) {
      const nestedName = `${name}${capitalize(key)}`;
      info.type = nestedName;

      const nestedFields = Array.from(info.nestedFields.entries())
        .map(([k, v]) => `  ${k}${v.optional ? '?' : ''}: ${v.type};`)
        .join('\n');

      nestedInterfaces.push(`export interface ${nestedName} {\n${nestedFields}\n}`);
    }
  }

  // Generate main interface
  const mainFields = Array.from(fields.entries())
    .map(([key, info]) => `  ${key}${info.optional ? '?' : ''}: ${info.type};`)
    .join('\n');

  const mainInterface = `export interface ${name} {\n${mainFields}\n}`;

  return [...nestedInterfaces, mainInterface].join('\n\n');
}

function capitalize(str: string): string {
  return str.split('_').map(part =>
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
}

/** Writes TypeScript types to a file. */
export async function writeTypes(content: string, outputPath: string): Promise<void> {
  const header = '// Auto-generated by @skippy/cache - do not edit manually\n\n';
  await Bun.write(outputPath, header + content);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test generate-types
```

**Expected:** All tests PASS.

### Checkpoint 2C
- [ ] Tests pass
- [ ] `inferType` correctly identifies all JS types
- [ ] `generateTypeScript` produces valid interface syntax

---

## Task 2D: Test Fixture Generator

**Depends on:** 2A complete (needs download functions)
**Can run parallel with:** 2C
**Files Created:**
- `apps/cache/src/generate-test-fixtures.ts`
- `apps/cache/test/generate-test-fixtures.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/cache/test/generate-test-fixtures.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createFixture, FIXTURE_SIZE } from '../src/generate-test-fixtures';

describe('FIXTURE_SIZE', () => {
  test('is set to 5 items', () => {
    expect(FIXTURE_SIZE).toBe(5);
  });
});

describe('createFixture', () => {
  test('takes first N items from data', () => {
    const items = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
      { id: '6' },
      { id: '7' },
    ];

    const fixture = createFixture(items, 3);

    expect(fixture).toHaveLength(3);
    expect(fixture[0]).toEqual({ id: '1' });
    expect(fixture[2]).toEqual({ id: '3' });
  });

  test('returns all items if less than requested', () => {
    const items = [{ id: '1' }, { id: '2' }];

    const fixture = createFixture(items, 5);

    expect(fixture).toHaveLength(2);
  });

  test('returns empty array for empty input', () => {
    const fixture = createFixture([], 5);
    expect(fixture).toEqual([]);
  });

  test('defaults to FIXTURE_SIZE items', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));

    const fixture = createFixture(items);

    expect(fixture).toHaveLength(FIXTURE_SIZE);
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test generate-test-fixtures
```

**Expected:** Tests FAIL because file doesn't exist.

### TDD Step 3: Implement generate-test-fixtures.ts

Create `apps/cache/src/generate-test-fixtures.ts`:

```typescript
export const FIXTURE_SIZE = 5;

/** Creates a test fixture from the first N items. */
export function createFixture<T>(items: T[], count: number = FIXTURE_SIZE): T[] {
  return items.slice(0, count);
}

/** Writes fixture data to JSON file. */
export async function writeFixture(data: unknown[], outputPath: string): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await Bun.write(outputPath, content);
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test generate-test-fixtures
```

**Expected:** All tests PASS.

### Checkpoint 2D
- [ ] Tests pass
- [ ] `createFixture` slices correct number of items

---

## Task 2E: Cache CLI Entry Point

**Depends on:** 2A, 2B, 2C, 2D complete
**Files Created:**
- `apps/cache/src/index.ts`

### TDD Step 1: Write integration test FIRST

Create `apps/cache/test/index.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { runCache, CacheOptions } from '../src/index';
import { Endpoint } from '@skippy/shared';

// We test the orchestration logic, not the actual downloads
describe('runCache', () => {
  test('exports runCache function', () => {
    expect(typeof runCache).toBe('function');
  });

  test('CacheOptions has correct defaults', () => {
    const defaults: CacheOptions = {
      dataDir: './data',
      endpoints: Object.values(Endpoint),
      generateTypes: true,
      generateFixtures: true,
    };

    expect(defaults.dataDir).toBe('./data');
    expect(defaults.endpoints).toHaveLength(5);
  });
});
```

### TDD Step 2: Implement index.ts

Create `apps/cache/src/index.ts`:

```typescript
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Endpoint, Config, Logger } from '@skippy/shared';
import { downloadAndNormalize } from './download';
import { generateSchema, writeSchema } from './generate-schema';
import { generateTypeScript, writeTypes } from './generate-types';
import { createFixture, writeFixture } from './generate-test-fixtures';

export interface CacheOptions {
  dataDir: string;
  endpoints: Endpoint[];
  generateTypes: boolean;
  generateFixtures: boolean;
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
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dataDir, endpoints } = opts;

  logger.info('Starting cache update', { dataDir, endpoints: endpoints.length });

  for (const endpoint of endpoints) {
    const endpointDir = join(dataDir, endpoint);
    await mkdir(endpointDir, { recursive: true });

    const endpointLogger = logger.child({ endpoint });

    try {
      // 1. Download and normalize
      endpointLogger.info('Downloading...');
      const data = await downloadAndNormalize(endpoint);
      endpointLogger.success(`Downloaded ${data.length} items`);

      // 2. Write data
      const dataPath = join(endpointDir, 'data.json');
      await Bun.write(dataPath, JSON.stringify(data, null, 2));

      // 3. Generate and write schema
      const schema = generateSchema(data);
      const schemaPath = join(endpointDir, 'schema.json');
      await writeSchema(schema, schemaPath);
      endpointLogger.success(`Generated schema with ${schema.fields.length} fields`);

      // 4. Generate types (if enabled)
      if (opts.generateTypes && data.length > 0) {
        const typeName = endpointToTypeName(endpoint);
        const types = generateTypeScript(typeName, data);
        const typesDir = join('packages/shared/src/types');
        await mkdir(typesDir, { recursive: true });
        const typesPath = join(typesDir, `${endpoint}.ts`);
        await writeTypes(types, typesPath);
        endpointLogger.success(`Generated types: ${typeName}`);
      }

      // 5. Generate test fixtures (if enabled)
      if (opts.generateFixtures) {
        const fixturesDir = join('test/fixtures');
        await mkdir(fixturesDir, { recursive: true });
        const fixture = createFixture(data);
        const fixturePath = join(fixturesDir, `${endpoint}.json`);
        await writeFixture(fixture, fixturePath);
        endpointLogger.success(`Generated fixture with ${fixture.length} items`);
      }
    } catch (error) {
      endpointLogger.error('Failed', { error: (error as Error).message });
      throw error;
    }
  }

  logger.success('Cache update complete');
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

  runCache(config, logger).catch(error => {
    logger.error('Cache failed', { error: error.message });
    process.exit(1);
  });
}

export { CacheOptions };
```

### TDD Step 3: Run tests - verify GREEN

```bash
bun test apps/cache
```

**Expected:** All tests PASS.

### Checkpoint 2E
- [ ] All cache tests pass
- [ ] Can run: `bun run apps/cache/src/index.ts`
- [ ] Creates data directories with JSON files

---

## Wave 2 Complete Checklist

Before starting Wave 3, verify ALL:

- [ ] `bun test apps/cache` - all tests pass
- [ ] `bun run apps/cache/src/index.ts` executes without error
- [ ] `data/items/data.json` exists with items
- [ ] `data/items/schema.json` exists with fields
- [ ] `packages/shared/src/types/items.ts` exists (generated)
- [ ] `test/fixtures/items.json` exists with 5 items

**Wave 2 is DONE. Proceed to Wave 3.**
