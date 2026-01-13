# Zod Schema Generation Design

## Problem

Data files are loaded with `as Type[]` casts - no runtime validation. If JSON structure diverges from types, we get silent failures.

## Solution

Generate Zod schemas during cache. Use them for:

1. Runtime validation when loading data in MCP server
2. TypeScript types (inferred via `z.infer<>`)
3. Field path extraction (replaces `schema.json`)

Single source of truth: Zod schema defines validation, types, AND available fields.

## Design Decisions

- **Zod as source of truth** - Types inferred from schemas, not generated separately
- **Separate schemas directory** - `packages/shared/src/schemas/`
- **Auto-extract nested schemas** - `QuestRewardSchema`, `ItemStatBlockSchema` etc.
- **Eliminate schema.json** - Extract field paths from Zod schema at runtime
- **Remove --no-types flag** - No longer needed

## Changes

### Delete

- `apps/cache/src/generate-types.ts`
- `apps/cache/src/generate-schema.ts`
- `packages/shared/src/types/items.ts`
- `packages/shared/src/types/arcs.ts`
- `packages/shared/src/types/quests.ts`
- `packages/shared/src/types/traders.ts`
- `packages/shared/src/types/events.ts`

### Create

- `apps/cache/src/generate-zod-schemas.ts` - Schema generator
- `packages/shared/src/schemas/items.ts` - Generated
- `packages/shared/src/schemas/arcs.ts` - Generated
- `packages/shared/src/schemas/quests.ts` - Generated
- `packages/shared/src/schemas/traders.ts` - Generated
- `packages/shared/src/schemas/events.ts` - Generated
- `packages/shared/src/schemas/utils.ts` - `extractFieldPaths()` utility
- `packages/shared/src/schemas/index.ts` - Re-exports

### Modify

- `apps/cache/src/index.ts` - Call new generator, remove schema.json step
- `apps/cli/src/commands/cache.ts` - Remove `--no-types` option
- `apps/mcp-server/src/loaders/data-loader.ts` - Use `.parse()` instead of `as` casts
- `apps/mcp-server/src/utils/schema.ts` - Use `extractFieldPaths()` instead of loading JSON
- `packages/shared/src/index.ts` - Export from schemas, remove old type exports
- All imports of entity types - Update paths

## Generator Logic

**Input:** Array of objects from `data.json`

**Process:**

1. Analyze all objects to determine field presence (required vs optional)
2. Infer Zod type for each field (`z.string()`, `z.number()`, `z.boolean()`, unions)
3. Nested objects → extract as named sub-schema
4. Arrays of objects → extract item schema, wrap in `z.array()`
5. Handle nullable fields with `.nullable()` or `.optional()`

**Output format:**

```typescript
import { z } from 'zod';

export const ItemStatBlockSchema = z.object({
  damage: z.number().optional(),
  health: z.number().optional(),
});

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  stat_block: ItemStatBlockSchema.optional(),
});

export type Item = z.infer<typeof ItemSchema>;
export type ItemStatBlock = z.infer<typeof ItemStatBlockSchema>;
```

**Naming:** `{Endpoint}{NestedPath}Schema` → `QuestRewardSchema`, `ItemStatBlockSchema`

## Field Path Extraction

Replace `schema.json` loading with:

```typescript
// packages/shared/src/schemas/utils.ts
export function extractFieldPaths(schema: z.ZodObject<unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(schema.shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    // Recursively extract from nested objects
    const inner = unwrapZodType(value);
    if (inner instanceof z.ZodObject) {
      paths.push(...extractFieldPaths(inner, path));
    }
  }
  return paths;
}
```

## MCP Integration

```typescript
// data-loader.ts
import { ItemSchema, EventSchema } from '@skippy/shared';

const SCHEMAS = {
  [Endpoint.ITEMS]: ItemSchema,
  [Endpoint.ARCS]: ArcSchema,
  [Endpoint.QUESTS]: QuestSchema,
  [Endpoint.TRADERS]: TraderSchema,
  [Endpoint.EVENTS]: EventSchema,
};

// Replace: const data = (await dataFile.json()) as SearchableEntity[];
// With:
const schema = SCHEMAS[endpoint];
const data = z.array(schema).parse(await dataFile.json());
```

## Cleanup

Audit for code that should be in `@skippy/shared` but isn't - minimal cleanup pass.

## Tests

- Unit tests for Zod inference logic (primitives, optionals, nested objects, arrays)
- Unit tests for `extractFieldPaths()`
- Snapshot test: generate schemas from fixture data, compare output
- Integration: MCP starts successfully with valid data
- Negative: malformed JSON fails with clear Zod error
