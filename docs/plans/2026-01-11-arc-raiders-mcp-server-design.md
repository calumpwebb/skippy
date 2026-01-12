# Arc Raiders MCP Server - Design Document

**Date:** 2026-01-11
**Status:** Design Phase
**Author:** Design Session with Claude

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Guiding Principles](#guiding-principles)
5. [Development Workflow (TDD)](#development-workflow-tdd)
6. [Data Architecture](#data-architecture)
7. [MCP Tools & Resources](#mcp-tools--resources)
8. [Search Implementation](#search-implementation)
9. [Configuration Management](#configuration-management)
10. [Testing Strategy](#testing-strategy)
11. [Error Handling & Logging](#error-handling--logging)
12. [Code Standards](#code-standards)
13. [Migration from Python](#migration-from-python)
14. [Implementation Phases](#implementation-phases)

---

## Overview

A TypeScript-based MCP (Model Context Protocol) server providing semantic search over Arc Raiders game data. Enables LLMs like Claude to answer natural language questions about items, quests, ARCs, traders, and events through intelligent search tools.

**Key Features:**
- Semantic + fuzzy hybrid search
- Local embeddings (no API costs, offline capable)
- Type-safe with exhaustive checking
- Test-driven development ready
- Future-proof for web UI and API extensions

---

## Project Structure

### Repository Layout

```
skippy/
├── apps/
│   ├── cli/                     # Main CLI (skippy cache, skippy mcp)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cache/                   # Data downloader & processor
│   │   ├── src/
│   │   │   ├── index.ts         # Main entry point
│   │   │   ├── download.ts      # API downloading
│   │   │   ├── generate-schema.ts
│   │   │   ├── generate-types.ts
│   │   │   ├── generate-embeddings.ts
│   │   │   └── generate-test-fixtures.ts
│   │   └── package.json
│   │
│   └── mcp-server/              # MCP server implementation
│       ├── src/
│       │   ├── index.ts         # Server entry point
│       │   ├── server.ts        # MCP server setup
│       │   ├── tools/
│       │   │   ├── registry.ts  # Tool definitions
│       │   │   ├── base-handler.ts
│       │   │   └── handlers/
│       │   │       ├── search-items.ts
│       │   │       ├── search-arcs.ts
│       │   │       ├── search-quests.ts
│       │   │       ├── search-traders.ts
│       │   │       └── get-events.ts
│       │   ├── resources/
│       │   │   └── glossary.ts
│       │   └── middleware/
│       │       └── logging.ts
│       └── package.json
│
├── packages/
│   ├── search/                  # Semantic & fuzzy search
│   │   ├── src/
│   │   │   ├── embeddings.ts    # Embedding generation
│   │   │   ├── similarity.ts    # Cosine similarity, vector math
│   │   │   ├── fuzzy.ts         # Keyword/fuzzy search
│   │   │   ├── hybrid.ts        # Combined search
│   │   │   └── index-manager.ts # Load/save vectra indices
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── package.json
│   │
│   └── shared/                  # Types, constants, config
│       ├── src/
│       │   ├── types/           # Generated + hand-written types
│       │   │   ├── item.ts      # Generated from schema
│       │   │   ├── arc.ts
│       │   │   ├── quest.ts
│       │   │   ├── trader.ts
│       │   │   ├── event.ts
│       │   │   └── search.ts    # Hand-written search types
│       │   ├── constants.ts     # Enums (Endpoint, ToolName, etc)
│       │   ├── config.ts        # Centralized config class
│       │   ├── logger.ts        # Structured logging
│       │   ├── tools/           # Tool schemas
│       │   │   ├── base.ts      # Base search patterns
│       │   │   ├── search-items.ts
│       │   │   ├── search-arcs.ts
│       │   │   ├── search-quests.ts
│       │   │   ├── search-traders.ts
│       │   │   └── get-events.ts
│       │   └── utils.ts         # Shared utilities
│       └── package.json
│
├── data/                        # Game data + embeddings
│   ├── items/
│   │   ├── data.json            # Downloaded items
│   │   ├── embeddings.bin       # Precomputed vectors
│   │   ├── index.json           # Index mapping
│   │   └── schema.json          # Field definitions
│   ├── arcs/
│   ├── quests/
│   ├── traders/
│   ├── events/
│   └── glossary.md              # MCP resource
│
├── test/
│   ├── fixtures/                # Auto-generated from real data
│   │   ├── items.json
│   │   ├── arcs.json
│   │   └── quests.json
│   └── integration/             # End-to-end tests
│
├── .husky/                      # Git hooks
│   └── pre-commit
├── .env                         # Environment variables
├── .env.example
├── turbo.json                   # Turborepo config
├── package.json                 # Root package
├── bunfig.toml                  # Bun config
├── tsconfig.json                # Base TypeScript config
├── .eslintrc.json               # Linting rules
└── .prettierrc                  # Code formatting
```

**Design Decision:** Apps contain executables, packages contain reusable libraries. This separation supports future extensions (web app, API server) while keeping MCP server isolated.

---

## Tech Stack

### Core Technologies

| Category | Technology | Rationale |
|----------|-----------|-----------|
| **Runtime** | Bun | Fast TS execution, built-in .env, package manager |
| **Language** | TypeScript (strict) | Type safety, exhaustive checking, no `any`s |
| **Monorepo** | Turborepo | Task orchestration, caching, scales with future apps |
| **Package Manager** | Bun | Unified toolchain, faster than npm/pnpm |
| **MCP SDK** | @modelcontextprotocol/sdk | Official SDK, Zod integration |

### Key Dependencies

**Search & Embeddings:**
- `@xenova/transformers` - Local transformer models (sentence-transformers)
- `vectra` - Fast approximate nearest neighbor search (HNSW algorithm)
- `fuse.js` - Fuzzy string matching for keyword search

**Validation & Schemas:**
- `zod` - Runtime type validation, schema definitions
- `zod-to-json-schema` - Convert Zod → JSON Schema for MCP
- `zod-validation-error` - Human-readable error messages

**Developer Experience:**
- `vitest` - Fast testing with coverage and watch mode
- `@vitest/ui` - Visual test runner
- `@modelcontextprotocol/inspector` - MCP debugging UI
- `consola` - Structured logging with colors
- `picocolors` - Inline color formatting
- `commander` - CLI argument parsing
- `cli-progress` - Progress bars for downloads
- `p-limit` - Concurrency control

**Code Quality:**
- `prettier` - Code formatting
- `eslint` - Linting with custom rules
- `husky` - Git hooks
- `lint-staged` - Run linters on staged files

### Packages NOT Used

**Avoided / Why:**
- `pnpm` - Using Bun for package management
- `dotenv` - Bun has built-in .env support
- `ts-node` - Bun runs TypeScript natively
- `jest` - Vitest is faster and more modern
- OpenAI API - Local embeddings keep it free and offline
- Mocking libraries - Pure functions + in-memory implementations instead

---

## Guiding Principles

### Core Principles

1. **Test-Driven Development (MANDATORY)**
   - **Tests are written BEFORE implementation code**
   - Red-Green-Refactor cycle is non-negotiable
   - No code is merged without tests
   - Tests are the specification

2. **Single Source of Truth**
   - Types defined once in `packages/shared`
   - Enums/constants - no magic strings
   - Config centralized in one class

3. **Exhaustive Checking**
   - TypeScript catches missing cases at compile time
   - `assertNever` helper for switch default cases
   - `Record<EnumType, ...>` forces handling all values

4. **YAGNI (You Aren't Gonna Need It)**
   - Build what's needed now
   - Don't over-engineer for hypothetical futures
   - Iterate based on real needs

5. **Testability First**
   - Pure functions over side effects
   - Dependency injection everywhere
   - In-memory implementations over mocks
   - Real test data from production schemas

6. **Configuration Over Globals**
   - No `process.env` except in Config class
   - All config injectable for testing
   - Validated at startup with Zod

### LLM-Friendly Codebase

**Code Organization:**
- Small, focused files (target 200 lines, max 250)
- Flat module structure (no deep nesting)
- Descriptive file names (no abbreviations)
- Co-locate related code

**Naming Conventions:**
- Explicit names over terse (`searchItemsBySemanticSimilarity` not `search`)
- No abbreviations (`embedding` not `emb`, `configuration` not `cfg`)
- Verb functions, noun classes (`generateSchema()`, `class SchemaGenerator`)
- Searchable names (unique enough to grep)

**Documentation:**
- Minimal TSDoc - single line description on exports
- Types are self-documenting (detailed @param/@returns not needed)
- Two-pass approach: write code first, add "why" comments in review
- Explain decisions and tradeoffs, not syntax

**Type Safety:**
- Always declare return types (no inference for functions)
- Narrow types (specific unions over broad types)
- Named parameter objects for 3+ arguments
- Branded types for IDs when needed

**Code Patterns:**
- Explicit over clever (clarity beats brevity)
- Max 3 levels of nesting (extract functions)
- Early returns (guard clauses at top)
- Avoid indirection (direct calls over callback chains)

### Enforceable Standards

**Via ESLint:**
- ✅ Require return types on functions
- ✅ Require TSDoc on exports (description only)
- ✅ Max 250 lines per file (communicate 200 to leave buffer)
- ✅ Max 3 levels of nesting
- ✅ No abbreviations in identifiers
- ✅ Ban `process.env` except in `packages/shared/src/config.ts`
- ✅ No magic strings (enforce enum usage)

**Via TypeScript:**
- ✅ Strict mode enabled
- ✅ No implicit any
- ✅ Strict null checks
- ✅ No unchecked indexed access
- ✅ No implicit returns
- ✅ No fallthrough in switch

**Design Decision:** Target 200 lines but enforce 250 to give buffer room for edge cases. Avoids constant lint errors while maintaining the principle.

### Parameter Ordering Convention

**Standard order (enforced by code review):**
1. Injected dependencies (services, loaders, embedders)
2. Required data (query, items, input)
3. Optional parameters (options objects)

```typescript
// ✅ Good
function search(
  loader: DataLoader,        // Dependency
  embedder: Embedder,         // Dependency
  query: string,              // Data
  fields: string[],           // Data
  options?: SearchOptions     // Optional
): SearchResult[]

// ❌ Bad - inconsistent
function search(
  query: string,
  loader: DataLoader,         // Should be first
  options?: SearchOptions,
  embedder: Embedder          // Should be second
)
```

**Design Decision:** Consistent ordering makes dependency injection obvious at call sites and improves code readability for both humans and LLMs.

---

## Development Workflow (TDD)

### TDD is Non-Negotiable

**Test-Driven Development is the ONLY way code is written in this project.**

This is not a suggestion. This is not optional. This applies to:
- ✅ Every new feature
- ✅ Every new function
- ✅ Every bug fix
- ✅ Every refactor
- ✅ Every module
- ✅ Every class

**No exceptions.**

### The Red-Green-Refactor Cycle

**For EVERY piece of functionality:**

```
1. RED - Write a failing test
   ↓
2. GREEN - Write minimal code to make it pass
   ↓
3. REFACTOR - Improve code while keeping tests green
   ↓
REPEAT for next feature
```

### TDD Workflow in Practice

**Feature: Extract nested field from object**

**1. RED - Write the test first (it fails)**
```typescript
// packages/shared/src/utils.test.ts
import { describe, test, expect } from 'vitest';
import { extractField } from './utils';

describe('extractField', () => {
  test('extracts top-level field', () => {
    const obj = { name: 'Blue Light Stick' };

    expect(extractField(obj, 'name')).toBe('Blue Light Stick');
  });

  test('extracts nested field with dot notation', () => {
    const obj = { stat_block: { damage: 50 } };

    expect(extractField(obj, 'stat_block.damage')).toBe(50);
  });

  test('returns undefined for missing field', () => {
    const obj = { name: 'Item' };

    expect(extractField(obj, 'missing')).toBeUndefined();
  });
});
```

Run tests: `bun test` → **All tests FAIL** (function doesn't exist)

**2. GREEN - Write minimal implementation**
```typescript
// packages/shared/src/utils.ts

export function extractField(obj: any, path: string): unknown {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

Run tests: `bun test` → **All tests PASS**

**3. REFACTOR - Improve code**
```typescript
// packages/shared/src/utils.ts

/** Extracts a field from an object using dot notation. */
export function extractField<T extends Record<string, any>>(
  obj: T,
  path: string
): unknown {
  return path.split('.').reduce(
    (current, key) => current?.[key],
    obj as any
  );
}
```

Run tests: `bun test` → **Tests still PASS**, code is better

**4. REPEAT - Add more tests for edge cases**
```typescript
test('handles array indices in path', () => {
  const obj = { items: [{ name: 'First' }] };

  expect(extractField(obj, 'items.0.name')).toBe('First');
});
```

Tests fail → Implement → Tests pass → Refactor → Repeat

### TDD Rules

**❌ NEVER:**
- Write implementation code without a failing test first
- Skip tests because "it's simple"
- Write tests after the implementation
- Commit code without tests
- Say "I'll add tests later"

**✅ ALWAYS:**
- Write the test first
- Watch it fail (RED)
- Write minimal code to pass (GREEN)
- Refactor with confidence (tests protect you)
- Commit tests AND implementation together

### Example TDD Sessions

**Session 1: Add cosine similarity function**

```typescript
// 1. RED
test('cosine similarity of identical vectors is 1', () => {
  expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
});
// FAIL - function doesn't exist

// 2. GREEN
function cosineSimilarity(a: number[], b: number[]): number {
  return 1; // Hardcoded to pass
}
// PASS

// 3. More tests (RED again)
test('cosine similarity of orthogonal vectors is 0', () => {
  expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
});
// FAIL - hardcoded 1 doesn't work

// 4. Real implementation (GREEN)
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}
// PASS

// 5. REFACTOR - add types, extract helpers
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  return dotProduct(a, b) / (magnitude(a) * magnitude(b));
}
// STILL PASS - refactor successful
```

**Session 2: Add hybrid search merging**

```typescript
// 1. RED
test('merges semantic and fuzzy results', () => {
  const semantic = [{ id: '1', score: 0.8 }];
  const fuzzy = [{ id: '2', score: 0.7 }];

  const merged = mergeResults(semantic, fuzzy);

  expect(merged).toHaveLength(2);
});
// FAIL

// 2. GREEN
function mergeResults(semantic, fuzzy) {
  return [...semantic, ...fuzzy];
}
// PASS

// 3. RED - Add deduplication test
test('deduplicates items found in both', () => {
  const semantic = [{ id: '1', score: 0.8 }];
  const fuzzy = [{ id: '1', score: 0.9 }];

  const merged = mergeResults(semantic, fuzzy);

  expect(merged).toHaveLength(1);
});
// FAIL - duplicates not handled

// 4. GREEN - Implement deduplication
function mergeResults(semantic, fuzzy) {
  const map = new Map();
  for (const item of semantic) map.set(item.id, item);
  for (const item of fuzzy) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}
// PASS

// Continue cycle for boosting, sorting, etc.
```

### TDD Benefits We Get

1. **Design feedback** - Hard to test = bad design, forces better architecture
2. **Living documentation** - Tests show how code is meant to be used
3. **Fearless refactoring** - Tests catch regressions immediately
4. **Incremental development** - Small steps, always working
5. **Fewer bugs** - Catches issues before they reach production
6. **Better interfaces** - Writing tests first reveals API issues

### Integration with Other Practices

**TDD + Pure Functions:**
```typescript
// Pure functions are easiest to test
test('filters items by rarity', () => {
  const items = [
    { name: 'Common Item', rarity: 'Common' },
    { name: 'Rare Item', rarity: 'Rare' }
  ];

  expect(filterByRarity(items, 'Rare')).toEqual([
    { name: 'Rare Item', rarity: 'Rare' }
  ]);
});
```

**TDD + Dependency Injection:**
```typescript
// Test with in-memory implementation
test('search engine finds items', async () => {
  const loader = new InMemoryDataLoader([/* test items */]);
  const engine = new SearchEngine(loader);

  const results = await engine.search('healing');

  expect(results.length).toBeGreaterThan(0);
});
```

**TDD + Type Safety:**
```typescript
// Types help tests catch issues
test('returns correct shape', () => {
  const result: SearchResult = search('query');

  expect(result).toHaveProperty('results');
  expect(result).toHaveProperty('totalMatches');
  expect(result).toHaveProperty('query');
});
```

### Tools Supporting TDD

**Vitest watch mode:**
```bash
bun test --watch  # Tests re-run on file changes
```

**MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector bun run apps/mcp-server/src/index.ts
# Test tools manually in browser while developing
```

**Coverage reports:**
```bash
bun test --coverage  # Ensure all code is tested
```

### Code Review Checklist

Before merging any code:
- [ ] Tests written BEFORE implementation
- [ ] All tests passing
- [ ] Coverage for happy path AND edge cases
- [ ] No commented-out tests
- [ ] No `.skip()` or `.only()` in tests
- [ ] Tests are readable and well-named
- [ ] Implementation is minimal (only what tests require)

### TDD Anti-Patterns to Avoid

**❌ Test-After Development:**
```typescript
// BAD - Wrote implementation first
function search() { /* complex logic */ }

// Then wrote tests to match what it does
test('does what the code does', () => { /* ... */ });
```

**❌ Testing Implementation Details:**
```typescript
// BAD - Testing private methods
test('_internalHelper works', () => { /* ... */ });
```

**❌ One Giant Test:**
```typescript
// BAD - Testing everything at once
test('search does everything', () => {
  // 100 lines of assertions
});
```

**✅ Test Behavior:**
```typescript
// GOOD - Each test covers one behavior
test('returns empty array when no matches', () => { /* ... */ });
test('returns items sorted by score', () => { /* ... */ });
test('limits results to requested amount', () => { /* ... */ });
```

### When Tests Get Hard to Write

**If a test is hard to write, your design needs work:**

- Hard to set up dependencies? → Use dependency injection
- Need to mock everything? → Extract pure functions
- Test is brittle? → Test behavior, not implementation
- Can't test in isolation? → Reduce coupling

**TDD guides better architecture.**

---

## Data Architecture

### Data Folder Structure

```
data/
├── items/
│   ├── data.json            # 519 items from API
│   ├── embeddings.bin       # Float32Array of vectors
│   ├── index.json           # Index position → item_id mapping
│   └── schema.json          # ["name", "value", "stat_block.damage", ...]
├── arcs/
│   ├── data.json            # 16 ARCs
│   ├── embeddings.bin
│   ├── index.json
│   └── schema.json
├── quests/
│   ├── data.json            # 72 quests
│   ├── embeddings.bin
│   ├── index.json
│   └── schema.json
├── traders/
│   ├── data.json            # 5 traders with inventories
│   ├── embeddings.bin
│   ├── index.json
│   └── schema.json
├── events/
│   ├── data.json            # Event schedule
│   ├── embeddings.bin
│   ├── index.json
│   └── schema.json
└── glossary.md              # Static resource for MCP
```

**Design Decision:** Group related files by entity type rather than by file type. Makes it clear what belongs together and easier to regenerate one entity at a time.

### Data Processing Flow

```
1. Download from API
   ↓
2. Normalize structure (extract from API wrappers)
   ↓
3. Generate schema (introspect fields including nested)
   ↓
4. Generate TypeScript types (from schema)
   ↓
5. Generate embeddings (semantic vectors)
   ↓
6. Generate test fixtures (first 5 items from real data)
   ↓
7. Commit everything to git
```

**Run via:** `skippy cache` (or `bun run cache`)

### Schema Generation

**Purpose:** Dynamically discover all fields including nested paths for field selection.

**Example schema.json:**
```json
{
  "fields": [
    "id",
    "name",
    "description",
    "value",
    "rarity",
    "item_type",
    "stat_block",
    "stat_block.damage",
    "stat_block.healing",
    "stat_block.weight"
  ]
}
```

**Design Decision:** Generate schemas at cache download time, not MCP server startup. Keeps server startup fast and ensures schema is always in sync with data.

### Embedding Generation

**Model:** `Xenova/all-MiniLM-L6-v2` (default, configurable)
- 384-dimensional vectors
- ~80MB model size
- Good balance of speed and accuracy
- Runs locally in Node/Bun via ONNX

**Searchable Text Format:**
```typescript
// For items:
`${item.name} ${item.description} ${item.item_type} ${item.rarity}`

// For quests:
`${quest.name} ${quest.objectives.join(' ')} ${quest.trader_name}`

// For ARCs:
`${arc.name} ${arc.description}`
```

**Storage Format:**
- `embeddings.bin` - Float32Array binary format
- `index.json` - Maps array index to entity ID
  ```json
  ["item-1", "item-2", "item-3"]
  ```

**Design Decision:** Precompute embeddings during cache download rather than on-demand. Makes searches instant (no embedding overhead) and commits embeddings to git for "batteries included" experience.

### Type Generation

**Tool:** Custom TypeScript generator (simpler than quicktype dependency)

**Generated types example:**
```typescript
// packages/shared/src/types/item.ts (generated)
export interface Item {
  id: string;
  name: string;
  description: string;
  value: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  item_type: string;
  stat_block: StatBlock;
  // ... all fields typed
}
```

**Design Decision:** Generate types from data rather than hand-write them. Schema changes auto-update types on next cache run. TypeScript compilation fails if code doesn't match new schema.

---

## MCP Tools & Resources

### Tools (5 total)

**1. search_items**
```typescript
{
  query: string;              // "blue light stick", "healing items"
  fields?: string[];          // ["name", "value", "stat_block.damage"]
  limit?: number;             // Max results (default: 5, max: 20)
}
→ {
  results: Partial<Item>[];
  totalMatches: number;
  query: string;
}
```

**2. search_arcs**
```typescript
{
  query: string;              // "big enemies", "flying arcs"
  fields?: string[];
  limit?: number;
}
→ {
  results: Partial<Arc>[];
  totalMatches: number;
  query: string;
}
```

**3. search_quests**
```typescript
{
  query: string;              // "celeste quests", "arc probe"
  fields?: string[];
  limit?: number;
}
→ {
  results: Partial<Quest>[];
  totalMatches: number;
  query: string;
}
```

**4. search_traders**
```typescript
{
  query: string;              // "apollo inventory", "who sells barricades"
  fields?: string[];
  limit?: number;
}
→ {
  results: Partial<TraderItem>[];
  totalMatches: number;
  query: string;
}
```

**5. get_events**
```typescript
{
  // No parameters
}
→ {
  events: Event[];            // All upcoming events
  cachedAt: string;           // ISO timestamp
}
```

### Tool Implementation Pattern

**All tools follow standardized pattern:**

```typescript
// 1. Define Zod schema with descriptions
export const SearchItemsParamsSchema = BaseSearchParamsSchema.extend({
  // Item-specific extensions here (future)
});

export type SearchItemsParams = z.infer<typeof SearchItemsParamsSchema>;

// 2. Define result schema
export const SearchItemsResultSchema = BaseSearchResultSchema(
  z.record(z.unknown())  // Partial item based on fields
);

export type SearchItemsResult = BaseSearchResult<Record<string, unknown>>;

// 3. Handler with single in, single out
export async function searchItems(
  params: SearchItemsParams,
  context: ToolContext
): Promise<SearchItemsResult> {
  // Validation happens automatically via Zod
  const results = await context.searchEngine.search('items', params);

  return {
    results,
    totalMatches: results.length,
    query: params.query
  };
}
```

**Base Pattern (shared across search tools):**

```typescript
// packages/shared/src/tools/base.ts

export const BaseSearchParamsSchema = z.object({
  query: z.string()
    .min(1)
    .describe('Natural language search query'),

  fields: z.array(z.string())
    .optional()
    .describe('Specific fields to return. Be token efficient - only request what you need.'),

  limit: z.number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of results')
});

export const BaseSearchResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    results: z.array(itemSchema),
    totalMatches: z.number(),
    query: z.string()
  });
```

**Design Decision:**
- Single parameter object (easy to extend, clear structure)
- Single return type (consistent, typed responses)
- Zod `.describe()` for field documentation (extracted to tool definitions)
- Base pattern prevents inconsistency across tools
- LLM must specify fields (no lazy defaults) to encourage token efficiency

### MCP Resources (1 total)

**arc-raiders://glossary**
- **Type:** Static markdown file
- **Location:** `data/glossary.md`
- **Purpose:** Explains game terminology for better query understanding
- **Content:** Definitions of ARC, trader, workbench, rarity, item types, etc.
- **Usage:** LLM reads when confused about terms like "barricade" or "deployable"

**Example glossary.md:**
```markdown
# Arc Raiders Glossary

**ARC** - Autonomous robotic combat units, the main enemies

**Trader** - NPCs who buy/sell items (Apollo, Celeste, Lance, Shani, TianWen)

**Workbench** - Crafting stations for creating items

**Rarity** - Common, Uncommon, Rare, Legendary (affects value)

**Quick Use** - Items in quick-access slots (medkits, lights, deployables)

**Barricade/Deployable** - Placeable items like cover, traps, lights

**Stat Block** - Item statistics (damage, healing, durability)
```

**Design Decision:** Static resource over generated. Game terminology changes rarely. Manual maintenance acceptable. Keeps it simple (YAGNI).

---

## Search Implementation

### Hybrid Search Strategy

**Combines semantic + fuzzy matching for best results:**

```
User Query: "blue light stick"
     ↓
1. Semantic Search (vectra + embeddings)
   → Finds conceptually similar items
   → ["Blue Light Stick", "Green Light Stick", "Red Light Stick"]

2. Fuzzy Keyword Search (fuse.js)
   → Handles typos and exact name matching
   → ["Blue Light Stick"]

3. Merge & Rank
   → Boost items found by both methods
   → Deduplicate
   → Sort by combined score
```

**Why Hybrid:**
- Semantic alone: Misses exact name matches, returns too many similar items
- Fuzzy alone: Poor with concepts ("healing items" wouldn't find "Medkit")
- Hybrid: Best of both worlds

### Semantic Search (vectra)

**Library:** `vectra` - Approximate nearest neighbor search using HNSW algorithm

**Setup:**
```typescript
import { LocalIndex } from 'vectra';

// Load index at startup
const index = new LocalIndex(dataDir + '/items');
await index.beginUpdate();
await index.addItem({
  id: 'item-1',
  vector: embeddings[0],  // Float32Array
  metadata: { name: 'Blue Light Stick' }
});
await index.endUpdate();
```

**Search:**
```typescript
const queryEmbedding = await embedder.embed(query);
const results = await index.queryItems(queryEmbedding, limit);
```

**Performance:**
- O(log n) search instead of O(n) brute force
- ~10-100x faster on large datasets
- <1% accuracy loss vs exact cosine similarity

**Design Decision:** Use vectra over naive cosine similarity. Dataset is small now (519 items) but scales better as game grows. Negligible overhead for current size.

### Fuzzy Keyword Search (fuse.js)

**Library:** `fuse.js` - Fuzzy string matching with typo tolerance

**Setup:**
```typescript
import Fuse from 'fuse.js';

const fuse = new Fuse(items, {
  keys: ['name', 'description', 'item_type'],
  threshold: 0.3,     // Fuzzy tolerance (0 = exact, 1 = match anything)
  ignoreLocation: true,
  includeScore: true
});
```

**Search:**
```typescript
const results = fuse.search('blu ligt');  // Typo!
// Still finds "Blue Light Stick"
```

**Benefits:**
- Handles typos and misspellings
- Boosts exact name matches (higher score than semantic)
- Fast (pre-indexed)

### Merge & Rank Algorithm

```typescript
export function hybridSearch(
  semanticResults: SearchResult[],
  fuzzyResults: SearchResult[]
): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  // Add semantic results
  for (const result of semanticResults) {
    merged.set(result.id, { ...result, score: result.score });
  }

  // Boost items that appear in both
  // Keyword matches get 1.5x boost because exact name matches should rank
  // higher than semantic similarity alone (e.g., "Blue Light Stick" > "Green Light Stick")
  for (const result of fuzzyResults) {
    if (merged.has(result.id)) {
      merged.get(result.id)!.score *= 1.5;
    } else {
      merged.set(result.id, result);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

**Design Decision:** 1.5x boost for fuzzy matches balances exact vs conceptual search. Tuned empirically - can adjust based on real usage.

### Result Ordering

**Results are returned in score-descending order (highest relevance first):**

```
Query: "blue light"

Results:
1. Blue Light Stick     (score: 1.5) ← Found by both (boosted)
2. Green Light Stick    (score: 0.9) ← Semantic match
3. Blue Paint           (score: 0.7) ← Fuzzy match (keyword)
4. Flashlight           (score: 0.5) ← Semantic match
5. Blue Backpack        (score: 0.4) ← Fuzzy match
```

**Scoring breakdown:**

| Match Type | Base Score | Final Score | Reason |
|-----------|-----------|-------------|---------|
| **Both** (semantic + fuzzy) | 0.9 | 1.35 (0.9 × 1.5) | Exact name match + conceptual similarity |
| **Semantic only** | 0.8 | 0.8 | Conceptually related but not exact name |
| **Fuzzy only** | 0.7 | 0.7 | Name similarity but not conceptually related |

**Why this ordering works:**

1. **Exact matches rank highest** - If user searches "blue light", "Blue Light Stick" should be #1
2. **Related items follow** - "Green Light Stick" is conceptually similar
3. **Partial matches last** - "Blue Paint" has keyword but isn't related

**Tie-breaking:**

When multiple items have identical scores:
- Maintain insertion order (semantic results before fuzzy-only)
- Could add secondary sort by item value, rarity, or alphabetical (future enhancement)

**Limiting results:**

```typescript
return Array.from(merged.values())
  .sort((a, b) => b.score - a.score)  // Highest score first
  .slice(0, limit);                    // Take top N
```

User requests `limit: 5` → Returns top 5 highest-scoring matches.

**Design Decision:** Sort by relevance score ensures most relevant results appear first. LLM typically only needs top 3-5 results to answer questions accurately. Higher limit available if needed (max 20).

### Score Fusion Strategy

**Our approach: Simple multiplicative boost**

Items found by both semantic and fuzzy search get a 1.5x score multiplier.

**Industry Context:**
- ✅ **Hybrid search** (semantic + keyword) - Industry standard (Elasticsearch, Algolia, Pinecone)
- ✅ **Score normalization** - Standard practice (normalize both methods to 0-1 scale)
- ✅ **Boosting agreement** - Standard (called "score fusion" or "rank fusion")
- ⚠️ **1.5x multiplier** - Our choice, needs tuning based on real usage

**Why 1.5x:**
- Simple to understand and debug
- Common starting point in production systems
- Easy to tune (increase if exact matches rank too low, decrease if they dominate)
- Balances exact name matches with conceptual similarity

**Alternative Fusion Methods (Future):**

1. **Reciprocal Rank Fusion (RRF)** - More sophisticated
   ```typescript
   // Used by Elasticsearch hybrid search
   function rrfScore(rank: number, k: number = 60): number {
     return 1 / (k + rank);
   }

   const score = rrfScore(semanticRank) + rrfScore(fuzzyRank);
   ```

2. **Weighted Linear Combination**
   ```typescript
   const score = (semanticScore * 0.7) + (fuzzyScore * 0.3);
   ```

3. **Max Score** - Take highest of the two
   ```typescript
   const score = Math.max(semanticScore, fuzzyScore);
   ```

**Design Decision:** Start with simple 1.5x boost. It's easy to understand, debug, and tune. Can upgrade to RRF if simple boosting proves insufficient after real-world usage. Empirical tuning beats theoretical complexity.

**Tuning Guidelines:**
- Exact matches ranking too low? → Increase multiplier (1.8x, 2.0x)
- Exact matches dominating? → Decrease multiplier (1.3x, 1.2x)
- Poor conceptual matches? → Adjust semantic model or embedding text
- Too many typo matches? → Adjust fuse.js threshold (0.3 → 0.2)

### Field Extraction

**Supports dot notation for nested fields:**

```typescript
function extractFields(
  obj: any,
  fields: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const value = getNestedValue(obj, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }

  return result;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

**Example:**
```typescript
extractFields(item, ['name', 'stat_block.damage'])
// Returns: { name: "AR-15", "stat_block.damage": 45 }
```

**Design Decision:** Use dot notation over nested objects in field array. More compact, matches common API patterns (GraphQL, MongoDB).

---

## Configuration Management

### Centralized Config Class

**Location:** `packages/shared/src/config.ts`

**Schema:**
```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Embeddings
  EMBEDDING_MODEL_NAME: z.string().default('Xenova/all-MiniLM-L6-v2'),
  EMBEDDING_MODEL_CACHE_DIR: z.string().default('./models'),

  // Data
  DATA_DIR: z.string().default('./data'),

  // MCP Server (future)
  MCP_SERVER_PORT: z.coerce.number().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export class Config {
  private env: Env;

  constructor(processEnv: NodeJS.ProcessEnv = process.env) {
    // Validate at construction - fails fast if invalid
    this.env = EnvSchema.parse(processEnv);
  }

  get logLevel() { return this.env.LOG_LEVEL; }
  get embeddingModelName() { return this.env.EMBEDDING_MODEL_NAME; }
  get embeddingModelCacheDir() { return this.env.EMBEDDING_MODEL_CACHE_DIR; }
  get dataDir() { return this.env.DATA_DIR; }
  get mcpServerPort() { return this.env.MCP_SERVER_PORT; }
}

// Singleton for convenience
export const config = new Config();
```

**Usage:**
```typescript
import { config } from '@skippy/shared';

const dataDir = config.dataDir;       // ✅ Type-safe
const level = config.logLevel;        // ✅ Validated enum
```

**Testing:**
```typescript
const testConfig = new Config({
  LOG_LEVEL: 'debug',
  DATA_DIR: './test-data'
});

const engine = new SearchEngine(loader, embedder, testConfig);
```

**ESLint Enforcement:**
```json
{
  "rules": {
    "no-restricted-globals": [
      "error",
      {
        "name": "process",
        "message": "Use Config class from @skippy/shared instead of direct process.env access"
      }
    ]
  },
  "overrides": [
    {
      "files": ["packages/shared/src/config.ts"],
      "rules": {
        "no-restricted-globals": "off"
      }
    }
  ]
}
```

**Design Decisions:**
- Single source of truth for environment variables
- Validation at startup catches misconfigurations early
- Testable via dependency injection
- Grouped by prefix (LOG_*, EMBEDDING_*, DATA_*)
- ESLint enforces usage (compile-time safety)

### Environment Variables

**`.env` file:**
```bash
# Logging
LOG_LEVEL=info

# Embeddings
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2
EMBEDDING_MODEL_CACHE_DIR=./models

# Data
DATA_DIR=./data
```

**`.env.example`** (committed to git):
```bash
# Copy to .env and customize

# Logging (debug, info, warn, error)
LOG_LEVEL=info

# Embedding model to use
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2

# Where to cache downloaded models
EMBEDDING_MODEL_CACHE_DIR=./models

# Where game data is stored
DATA_DIR=./data
```

---

## Testing Strategy

### Philosophy

**No mocks, real behavior:**
- Pure functions tested directly (no dependencies)
- In-memory implementations for I/O (real logic, just in RAM)
- Auto-generated fixtures from production data
- Contract testing ensures interchangeability

**Two-pass approach:**
1. Write clean, typed code with tests
2. Add "why" comments during code review

### Test Structure

```
packages/search/
├── src/
│   ├── similarity.ts
│   ├── embeddings.ts
│   └── hybrid.ts
├── test/
│   ├── unit/
│   │   ├── similarity.test.ts      # Pure functions
│   │   └── embeddings.test.ts
│   ├── integration/
│   │   └── hybrid-search.test.ts   # Multiple modules
│   └── fixtures/
│       ├── items.json              # Small real dataset
│       └── embeddings.bin
```

### Test Tiers

**Tier 1: Pure Functions (80% of code)**
```typescript
// No dependencies, no I/O - just logic
test('cosine similarity of identical vectors is 1', () => {
  const vec1 = [1, 0, 0];
  const vec2 = [1, 0, 0];

  expect(cosineSimilarity(vec1, vec2)).toBe(1);
});

test('extracts nested field from object', () => {
  const obj = { stat_block: { damage: 50 } };

  const value = getNestedValue(obj, 'stat_block.damage');

  expect(value).toBe(50);
});
```

**Tier 2: In-Memory Implementations (15% of code)**
```typescript
class InMemoryDataLoader implements DataLoader {
  constructor(private items: Item[]) {}

  async loadItems(): Promise<Item[]> {
    return this.items;  // Real method, pre-loaded data
  }
}

test('search engine finds items by query', async () => {
  const items = [
    itemBuilder({ name: 'Medkit', stat_block: { healing: 50 } }),
    itemBuilder({ name: 'Bandage', stat_block: { healing: 10 } })
  ];

  const loader = new InMemoryDataLoader(items);
  const engine = new SearchEngine(loader, embedder);

  const results = await engine.search('healing');

  expect(results).toContainEqual(expect.objectContaining({ name: 'Medkit' }));
});
```

**Tier 3: Integration Tests (5% of code)**
```typescript
test('end-to-end search with real embeddings', async () => {
  // Uses real files in test/fixtures/
  const loader = new FileSystemDataLoader('./test/fixtures');
  const embedder = new TransformersEmbedder(testConfig);
  const engine = new SearchEngine(loader, embedder);

  const results = await engine.search('healing items', ['name', 'value']);

  expect(results.length).toBeGreaterThan(0);
  expect(results[0]).toHaveProperty('name');
  expect(results[0]).toHaveProperty('value');
});
```

### Test Fixtures

**Auto-generated from production data:**

```typescript
// apps/cache/src/generate-test-fixtures.ts

export async function generateTestFixtures() {
  const items = await downloadItems();

  // Take first 5 real items for tests
  const testItems = items.slice(0, 5);

  await writeFile(
    'test/fixtures/items.json',
    JSON.stringify(testItems, null, 2)
  );

  consola.info('Generated test fixtures from real data');
}
```

**Benefits:**
- Always matches current schema
- Schema changes → re-run cache → fixtures auto-update
- Tests use realistic data structures
- No manual fixture maintenance

### Builder Pattern

**For custom test scenarios:**

```typescript
// packages/shared/test/builders/item-builder.ts

export function itemBuilder(overrides: Partial<Item> = {}): Item {
  const defaults: Item = {
    id: 'test-item',
    name: 'Test Item',
    description: 'Test description',
    value: 100,
    rarity: 'Common',
    item_type: 'Quick Use',
    stat_block: {
      healing: 0,
      damage: 0,
      weight: 1,
      // ... sensible defaults for all fields
    }
  };

  return { ...defaults, ...overrides };
}

// Usage:
const medkit = itemBuilder({
  name: 'Medkit',
  stat_block: { healing: 50 }  // Only override what matters
});
```

**Design Decision:** Builders for custom cases, fixtures for realistic data. Combination gives flexibility without maintenance burden.

### Contract Testing

**Ensures implementations are interchangeable:**

```typescript
export function testDataLoaderContract(
  name: string,
  factory: () => DataLoader
) {
  describe(`DataLoader contract: ${name}`, () => {
    let loader: DataLoader;

    beforeEach(() => {
      loader = factory();
    });

    test('loadItems returns array', async () => {
      const items = await loader.loadItems();
      expect(Array.isArray(items)).toBe(true);
    });

    test('items have required fields', async () => {
      const items = await loader.loadItems();
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('name');
    });
  });
}

// Test both implementations
testDataLoaderContract('FileSystemDataLoader', () =>
  new FileSystemDataLoader('./test/fixtures')
);

testDataLoaderContract('InMemoryDataLoader', () =>
  new InMemoryDataLoader(testItems)
);
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**', 'apps/*/src/**'],
      exclude: ['**/*.test.ts', '**/test/**']
    },
    setupFiles: ['./test/setup.ts']
  }
});
```

**Run commands:**
```bash
bun test                    # All tests
bun test --watch            # Watch mode
bun test --coverage         # With coverage report
bun test --ui               # Visual UI
bun test packages/search    # Specific package
```

---

## Error Handling & Logging

### Structured Logging

**Logger class with context:**

```typescript
// packages/shared/src/logger.ts

export class Logger {
  constructor(
    private readonly context: Record<string, unknown> = {},
    private readonly instance = consola
  ) {}

  child(context: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...context }, this.instance);
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (config.logLevel === LogLevel.INFO || config.logLevel === LogLevel.DEBUG) {
      this.instance.info(message, { ...this.context, ...meta });
    }
  }

  success(message: string, meta?: Record<string, unknown>) {
    this.instance.success(message, { ...this.context, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (config.logLevel === LogLevel.DEBUG) {
      this.instance.debug(message, { ...this.context, ...meta });
    }
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.instance.error(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.instance.warn(message, { ...this.context, ...meta });
  }
}

export const logger = new Logger();
```

### MCP Tool Logging

**Standard logging for all tool calls:**

```typescript
// apps/mcp-server/src/middleware/logging.ts

export async function withLogging<T>(
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

    if (config.logLevel === LogLevel.DEBUG) {
      toolLogger.debug('Tool result', { result });
    }

    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    toolLogger.error('Tool failed', {
      error: (error as Error).message,
      duration
    });
    throw error;
  }
}
```

**Output examples:**

```
INFO  Tool called { tool: 'search_items', params: { query: 'blue light', limit: 5 } }
SUCCESS Tool completed { tool: 'search_items', duration: 127 }

# Debug mode adds:
DEBUG Tool result { tool: 'search_items', result: [...] }

# Errors:
ERROR Tool failed { tool: 'search_items', error: 'Model not found', duration: 50 }
```

**Design Decision:**
- Log every request, success, duration
- Log results only in debug mode (can be verbose)
- Structured format for easy parsing/searching
- Child loggers bake in context (tool name, component)

### Error Handling

**Validation errors (Zod):**
```typescript
import { fromZodError } from 'zod-validation-error';

try {
  const params = SearchItemsParamsSchema.parse(rawParams);
} catch (err) {
  const readable = fromZodError(err);
  throw new Error(`Invalid parameters: ${readable.message}`);
}
```

**Expected errors:**
```typescript
export class ItemNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Item not found: ${itemId}`);
    this.name = 'ItemNotFoundError';
  }
}
```

**Unexpected errors:**
```typescript
// Let them bubble up with context
try {
  await searchEngine.search(query);
} catch (err) {
  logger.error('Search failed', {
    query,
    error: (err as Error).message,
    stack: (err as Error).stack
  });
  throw err;  // Re-throw for MCP to handle
}
```

---

## Code Standards

### File Size Limits

```json
{
  "rules": {
    // Target: 200 lines per file
    // Hard limit: 250 lines (enforced by ESLint)
    // Buffer room allows flexibility without breaking builds
    "max-lines": ["error", {
      "max": 250,
      "skipBlankLines": true,
      "skipComments": true
    }]
  }
}
```

### Documentation Standards

**Minimal TSDoc on exports:**

```typescript
// ✅ Good - minimal, type-safe
/** Generates embeddings for items using the configured model. */
export async function generateEmbeddings(
  items: Item[],
  config: Config
): Promise<Float32Array> {
  // Implementation
}

// ❌ Too much - over-engineered
/**
 * Generates embeddings for items using the configured model.
 *
 * This function takes an array of items and converts them into
 * vector embeddings using a transformer model. The embeddings
 * are used for semantic search functionality.
 *
 * @param items - An array of Item objects to generate embeddings for
 * @param config - Configuration object containing model settings
 * @returns A Promise that resolves to a Float32Array containing embeddings
 * @throws {Error} If the model fails to load
 * ...
 */
```

**"Why" comments added in review:**

```typescript
// Keyword matches get 1.5x boost because exact name matches should rank
// higher than semantic similarity alone (e.g., "Blue Light Stick" > "Green Light Stick")
for (const result of keywordResults) {
  if (merged.has(result.id)) {
    merged.get(result.id)!.score *= 1.5;
  }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Files** | kebab-case | `search-engine.ts` |
| **Classes** | PascalCase | `SearchEngine` |
| **Functions** | camelCase (verb) | `generateEmbeddings()` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RESULTS` |
| **Enums** | Object as const | `const Endpoint = { ... } as const` |
| **Interfaces** | PascalCase | `DataLoader` |
| **Types** | PascalCase | `SearchResult` |

### ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "max-lines": ["error", { "max": 250, "skipBlankLines": true, "skipComments": true }],
    "max-depth": ["error", 3],
    "no-restricted-globals": [
      "error",
      { "name": "process", "message": "Use Config class from @skippy/shared" }
    ],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^(items|arcs|quests|traders|events)$/]",
        "message": "Use Endpoint enum instead of string literals"
      }
    ],
    "unicorn/prevent-abbreviations": [
      "error",
      { "allowList": { "args": true, "props": true, "params": true } }
    ]
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

---

## Migration from Python

### Files to Remove

```bash
# Python code
rm -rf src/main.py
rm -rf .venv/
rm -rf pyproject.toml
rm -rf uv.lock
rm -rf .python-version

# Python tooling
rm -rf .ruff_cache/
```

### Git Hooks Migration

**Before (Python ruff):**
```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: ruff
      name: ruff
      entry: ruff check
```

**After (husky + lint-staged):**

```bash
# Install
bun add -D husky lint-staged

# Initialize
bunx husky init
```

```bash
# .husky/pre-commit
bun run lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Data Migration

**Move existing data:**
```bash
# Current structure
data/items.json

# New structure
mkdir -p data/items
mv data/items.json data/items/data.json
```

**Regenerate everything:**
```bash
skippy cache  # Downloads, generates schemas, types, embeddings
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Setup:**
- ✅ Initialize Turborepo monorepo
- ✅ Configure Bun, TypeScript, ESLint, Prettier
- ✅ Set up git hooks (husky + lint-staged)
- ✅ Create package structure (apps/, packages/)
- ✅ Configure Vitest
- ✅ Remove Python code and tooling

**Core Packages:**
- ✅ `packages/shared` - Config, Logger, constants
- ✅ TypeScript strict mode configuration
- ✅ ESLint rules for enforcing standards

**Tests:**
- ✅ Config validation tests
- ✅ Logger tests

### Phase 2: Data Pipeline (Week 1-2)

**Cache Downloader (`apps/cache`):**
- ✅ Download data from MetaForge API
- ✅ Normalize response structures
- ✅ Generate schemas (field introspection)
- ✅ Generate TypeScript types
- ✅ Generate test fixtures
- ✅ CLI with progress bars

**Tests:**
- ✅ Download tests (with small fixtures)
- ✅ Schema generation tests
- ✅ Type generation tests

### Phase 3: Embeddings & Search (Week 2)

**Search Package (`packages/search`):**
- ✅ Embedding generation with @xenova/transformers
- ✅ Vectra index setup
- ✅ Semantic search implementation
- ✅ Fuzzy search with fuse.js
- ✅ Hybrid search algorithm
- ✅ Field extraction utilities

**Tests:**
- ✅ Unit tests for similarity functions
- ✅ Embedding generation tests (with small model)
- ✅ Search algorithm tests
- ✅ Field extraction tests

### Phase 4: MCP Server (Week 3)

**MCP Server (`apps/mcp-server`):**
- ✅ Server setup with @modelcontextprotocol/sdk
- ✅ Tool registry with Zod schemas
- ✅ Base handler pattern
- ✅ Implement 5 search tools
- ✅ Glossary resource
- ✅ Logging middleware
- ✅ Error handling

**Tests:**
- ✅ Tool handler tests
- ✅ Integration tests with real data
- ✅ End-to-end MCP tests

### Phase 5: CLI & Polish (Week 4)

**CLI (`apps/cli`):**
- ✅ Commander setup
- ✅ `skippy cache` command
- ✅ `skippy mcp` command
- ✅ Help documentation

**Documentation:**
- ✅ README.md
- ✅ API documentation
- ✅ Usage examples
- ✅ .mcp.json setup guide

**Polish:**
- ✅ Performance optimization
- ✅ Error message improvements
- ✅ Add glossary content
- ✅ Test coverage review

### Phase 6: Release (Week 4)

**Pre-release:**
- ✅ Full test suite passing
- ✅ Code review
- ✅ Documentation review
- ✅ Manual testing with Claude Code

**Release:**
- ✅ Tag v1.0.0
- ✅ Publish to GitHub
- ✅ Write release notes
- ✅ Share in MCP community

---

## Future Enhancements (Out of Scope)

**Not building now (YAGNI):**
- JavaScript API server (wait for real need)
- React web UI (wait for real need)
- Additional MCP resources (assess after usage)
- Filters on search tools (add when requested)
- Real-time data updates (static cache is fine)
- Authentication/rate limiting (not needed for local use)
- Advanced search operators (simple queries work well)
- Multiple embedding models (one is sufficient)

**Will build when:**
- User feedback requests it
- Clear use case emerges
- Current solution proves insufficient

---

## Key Design Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **Bun over Node** | Faster execution, built-in TypeScript, unified tooling |
| **Turborepo** | Scales with future apps, good caching, standard monorepo tool |
| **No Python** | Single language ecosystem, better LLM ergonomics, modern tooling |
| **Strict TypeScript** | Catch errors at compile time, self-documenting code |
| **Zod for schemas** | Runtime validation + type generation + tool definitions |
| **Local embeddings** | Free, offline, privacy-friendly, no API dependencies |
| **Hybrid search** | Best accuracy - semantic + fuzzy catches more use cases |
| **Precomputed embeddings** | Fast searches, batteries-included repo |
| **In-memory tests** | Real behavior without mocks, fast, maintainable |
| **Auto-generated fixtures** | Schema changes don't break tests |
| **Centralized config** | Single source of truth, testable, enforced by lint |
| **Base search pattern** | Consistency across tools, easy to extend |
| **Minimal documentation** | Types are self-documenting, focus on "why" not "what" |
| **250 line limit** | Communicate 200 to leave buffer room |
| **Single param/return** | Clear signatures, easy to extend |
| **YAGNI** | Build what's needed, iterate based on real usage |

---

## Success Metrics

**Technical:**
- ✅ Test coverage >80%
- ✅ All tests pass
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ Search results <200ms
- ✅ MCP server startup <2s

**User Experience:**
- ✅ Works with Claude Code out of box
- ✅ Handles typos and partial names
- ✅ Finds conceptually similar items
- ✅ Returns relevant results in top 5
- ✅ Clear error messages

**Maintainability:**
- ✅ New contributor can understand codebase in <1 hour
- ✅ Schema changes don't break tests
- ✅ Adding new tool takes <30 minutes
- ✅ No manual fixture maintenance needed

---

## Questions for Implementation

**Before starting:**
1. ✅ Approval on tech stack
2. ✅ Approval on project structure
3. ✅ Approval on MCP tools/resources
4. ✅ Approval on testing approach

**During implementation:**
- Adjust hybrid search weights based on results
- Tune fuzzy search threshold for accuracy
- Add filters if commonly requested
- Optimize embedding batch size for speed

---

**End of Design Document**
