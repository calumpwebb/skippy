# Zod Schema Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace TypeScript interface generation with Zod schema generation, eliminating `as Type[]` casts and `schema.json` files.

**Architecture:** Generate Zod schemas from cached JSON data. Schemas become single source of truth for runtime validation, TypeScript types (via `z.infer<>`), and field path extraction. MCP server parses data with Zod at startup instead of casting.

**Tech Stack:** Zod, Bun, Vitest

---

## Wave Structure

### Wave 1: Foundation (Tasks 1-3)

**Parallel tasks:**

- Task 1: extractFieldPaths utility (independent)
- Task 2: Zod schema generator - type inference (independent)

**Sequential:**

- Task 3: Full schema generation (depends on Task 2)

### Wave 2: Generate Schemas (Task 4)

**Sequential:**

- Task 4: Generate schemas for all endpoints (depends on Wave 1 complete)

### Wave 3: Integration (Tasks 5-7)

**Sequential:**

- Task 5: Wire into cache pipeline (depends on Task 4)

**Parallel tasks (after Task 5):**

- Task 6: MCP data loader with Zod parsing (depends on Task 4)
- Task 7: MCP schema utility update (depends on Tasks 1, 4)

### Wave 4: Cleanup (Tasks 8-12)

**Parallel tasks:**

- Task 8: Update shared package exports
- Task 9: Remove --no-types flag
- Task 11: Audit shared code

**Sequential:**

- Task 10: Delete old files (after Tasks 8-9)
- Task 12: Final verification (must be last)

---

## Task 1: Create Zod Field Path Extractor

Create utility to extract field paths from Zod schemas (replaces schema.json loading).

**Files:**

- Create: `packages/shared/src/schemas/utils.ts`
- Create: `packages/shared/test/schemas/utils.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/shared/test/schemas/utils.test.ts
import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { extractFieldPaths } from '../../src/schemas/utils';

describe('extractFieldPaths', () => {
  test('extracts top-level field names', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      value: z.number(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'name', 'value']);
  });

  test('extracts nested object field paths', () => {
    const schema = z.object({
      id: z.string(),
      stat_block: z.object({
        damage: z.number(),
        health: z.number(),
      }),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('id');
    expect(paths).toContain('stat_block');
    expect(paths).toContain('stat_block.damage');
    expect(paths).toContain('stat_block.health');
  });

  test('handles optional fields', () => {
    const schema = z.object({
      id: z.string(),
      description: z.string().optional(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'description']);
  });

  test('handles nullable fields', () => {
    const schema = z.object({
      id: z.string(),
      description: z.string().nullable(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'description']);
  });

  test('extracts array element object fields', () => {
    const schema = z.object({
      id: z.string(),
      locations: z.array(
        z.object({
          map: z.string(),
          x: z.number(),
        })
      ),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('locations');
    expect(paths).toContain('locations.map');
    expect(paths).toContain('locations.x');
  });

  test('handles deeply nested structures', () => {
    const schema = z.object({
      rewards: z.array(
        z.object({
          item: z.object({
            name: z.string(),
            rarity: z.string(),
          }),
        })
      ),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('rewards');
    expect(paths).toContain('rewards.item');
    expect(paths).toContain('rewards.item.name');
    expect(paths).toContain('rewards.item.rarity');
  });

  test('handles primitive arrays without nested paths', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['tags']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test packages/shared/test/schemas/utils.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// packages/shared/src/schemas/utils.ts
import { z } from 'zod';

/**
 * Unwraps Zod wrapper types (optional, nullable, default) to get inner type.
 */
function unwrapZodType(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZodType(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZodType(schema._def.innerType);
  }
  return schema;
}

/**
 * Extracts all field paths from a Zod object schema.
 * Returns paths like ['id', 'name', 'stat_block', 'stat_block.damage'].
 */
export function extractFieldPaths(schema: z.ZodObject<z.ZodRawShape>, prefix = ''): string[] {
  const paths: string[] = [];
  const shape = schema.shape;

  for (const [key, value] of Object.entries(shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);

    const unwrapped = unwrapZodType(value as z.ZodTypeAny);

    if (unwrapped instanceof z.ZodObject) {
      paths.push(...extractFieldPaths(unwrapped, path));
    } else if (unwrapped instanceof z.ZodArray) {
      const elementType = unwrapZodType(unwrapped.element);
      if (elementType instanceof z.ZodObject) {
        paths.push(...extractFieldPaths(elementType, path));
      }
    }
  }

  return paths;
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test packages/shared/test/schemas/utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared/src/schemas/utils.ts packages/shared/test/schemas/utils.test.ts
git commit -m "$(cat <<'EOF'
feat(shared): add extractFieldPaths utility for Zod schemas

Extracts all field paths from Zod object schemas including nested
objects and arrays. Replaces schema.json field extraction.
EOF
)"
```

---

## Task 2: Create Zod Schema Generator - Type Inference

Build the core type inference logic for generating Zod schemas from data.

**Files:**

- Create: `apps/cache/src/generate-zod-schemas.ts`
- Create: `apps/cache/test/generate-zod-schemas.test.ts`

**Step 1: Write failing tests for type inference**

```typescript
// apps/cache/test/generate-zod-schemas.test.ts
import { describe, test, expect } from 'vitest';
import { inferZodType } from '../src/generate-zod-schemas';

describe('inferZodType', () => {
  test('infers string type', () => {
    expect(inferZodType('hello')).toBe('z.string()');
  });

  test('infers number type', () => {
    expect(inferZodType(42)).toBe('z.number()');
    expect(inferZodType(3.14)).toBe('z.number()');
  });

  test('infers boolean type', () => {
    expect(inferZodType(true)).toBe('z.boolean()');
    expect(inferZodType(false)).toBe('z.boolean()');
  });

  test('infers null type', () => {
    expect(inferZodType(null)).toBe('z.null()');
  });

  test('infers primitive array types', () => {
    expect(inferZodType(['a', 'b'])).toBe('z.array(z.string())');
    expect(inferZodType([1, 2, 3])).toBe('z.array(z.number())');
    expect(inferZodType([true, false])).toBe('z.array(z.boolean())');
  });

  test('returns z.unknown() for empty array', () => {
    expect(inferZodType([])).toBe('z.array(z.unknown())');
  });

  test('returns object marker for objects', () => {
    expect(inferZodType({ key: 'value' })).toBe('__object__');
  });

  test('returns object array marker for array of objects', () => {
    expect(inferZodType([{ id: 1 }])).toBe('__object_array__');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test apps/cache/test/generate-zod-schemas.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// apps/cache/src/generate-zod-schemas.ts

/** Infers Zod type string from a JavaScript value. */
export function inferZodType(value: unknown): string {
  if (value === null) return 'z.null()';
  if (value === undefined) return 'z.undefined()';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'z.array(z.unknown())';
    const firstElement = value[0];
    if (typeof firstElement === 'object' && firstElement !== null) {
      return '__object_array__';
    }
    const elementType = inferZodType(firstElement);
    return `z.array(${elementType})`;
  }

  const type = typeof value;
  if (type === 'object') return '__object__';
  if (type === 'string') return 'z.string()';
  if (type === 'number') return 'z.number()';
  if (type === 'boolean') return 'z.boolean()';

  return 'z.unknown()';
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test apps/cache/test/generate-zod-schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cache/src/generate-zod-schemas.ts apps/cache/test/generate-zod-schemas.test.ts
git commit -m "$(cat <<'EOF'
feat(cache): add inferZodType for Zod schema generation

Core type inference that maps JavaScript values to Zod type strings.
Uses markers for objects/arrays that need nested schema extraction.
EOF
)"
```

---

## Task 3: Zod Schema Generator - Full Generation

Add the full schema generation from data arrays.

**Files:**

- Modify: `apps/cache/src/generate-zod-schemas.ts`
- Modify: `apps/cache/test/generate-zod-schemas.test.ts`

**Step 1: Add failing tests for full generation**

```typescript
// apps/cache/test/generate-zod-schemas.test.ts (append to existing)

describe('generateZodSchema', () => {
  test('generates schema with simple fields', () => {
    const items = [{ id: '1', name: 'Test', value: 100 }];

    const result = generateZodSchema('Item', items);

    expect(result).toContain("import { z } from 'zod';");
    expect(result).toContain('export const ItemSchema = z.object({');
    expect(result).toContain('id: z.string()');
    expect(result).toContain('name: z.string()');
    expect(result).toContain('value: z.number()');
    expect(result).toContain('export type Item = z.infer<typeof ItemSchema>;');
  });

  test('generates optional fields when not in all items', () => {
    const items = [
      { id: '1', name: 'Test' },
      { id: '2', name: 'Test2', extra: 'field' },
    ];

    const result = generateZodSchema('Item', items);

    expect(result).toContain('id: z.string()');
    expect(result).toContain('extra: z.string().optional()');
  });

  test('generates nested schema for objects', () => {
    const items = [
      {
        id: '1',
        stat_block: { damage: 50, health: 100 },
      },
    ];

    const result = generateZodSchema('Item', items);

    expect(result).toContain('export const ItemStatBlockSchema = z.object({');
    expect(result).toContain('damage: z.number()');
    expect(result).toContain('health: z.number()');
    expect(result).toContain('stat_block: ItemStatBlockSchema');
    expect(result).toContain('export type ItemStatBlock = z.infer<typeof ItemStatBlockSchema>;');
  });

  test('generates schema for array of objects', () => {
    const items = [
      {
        id: '1',
        locations: [
          { map: 'map1', x: 10 },
          { map: 'map2', x: 20 },
        ],
      },
    ];

    const result = generateZodSchema('Item', items);

    expect(result).toContain('export const ItemLocationSchema = z.object({');
    expect(result).toContain('map: z.string()');
    expect(result).toContain('x: z.number()');
    expect(result).toContain('locations: z.array(ItemLocationSchema)');
  });

  test('handles nullable fields', () => {
    const items = [
      { id: '1', description: 'text' },
      { id: '2', description: null },
    ];

    const result = generateZodSchema('Item', items);

    expect(result).toContain('description: z.string().nullable()');
  });

  test('returns empty string for empty items', () => {
    const result = generateZodSchema('Item', []);
    expect(result).toBe('');
  });

  test('includes auto-generated header', () => {
    const items = [{ id: '1' }];
    const result = generateZodSchema('Item', items);
    expect(result).toContain('// Auto-generated by @skippy/cache - do not edit manually');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test apps/cache/test/generate-zod-schemas.test.ts`
Expected: FAIL - generateZodSchema not defined

**Step 3: Write implementation**

```typescript
// apps/cache/src/generate-zod-schemas.ts (add after inferZodType)

interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
  nullable: boolean;
  nestedFields?: Map<string, FieldInfo>;
  arrayElementFields?: Map<string, FieldInfo>;
}

/** Finds the first non-empty array value for a field across all items. */
function findNonEmptyArray(items: unknown[], key: string): unknown[] | null {
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }
  return null;
}

/** Collects all array elements for a given key across all items. */
function collectArrayElements(items: unknown[], key: string): unknown[] {
  const elements: unknown[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const value = record[key];
    if (Array.isArray(value)) {
      elements.push(...value);
    }
  }
  return elements;
}

/** Checks if a field has null values in any item. */
function hasNullValues(items: unknown[], key: string): boolean {
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (key in record && record[key] === null) {
      return true;
    }
  }
  return false;
}

/** Creates FieldInfo for a single key-value pair. */
function createFieldInfo(key: string, value: unknown, allItems: unknown[]): FieldInfo {
  const info: FieldInfo = {
    name: key,
    type: inferZodType(value),
    optional: false,
    nullable: hasNullValues(allItems, key),
  };

  // Handle nested objects (but not null)
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    info.nestedFields = analyzeFields([value], allItems);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const nonEmptyArray = value.length > 0 ? value : findNonEmptyArray(allItems, key);
    if (nonEmptyArray && nonEmptyArray.length > 0) {
      const firstElement = nonEmptyArray[0];
      if (typeof firstElement === 'object' && firstElement !== null) {
        const allArrayElements = collectArrayElements(allItems, key);
        info.arrayElementFields = analyzeFields(allArrayElements, allItems);
        info.type = '__object_array__';
      }
    }
  }

  return info;
}

/** Analyzes items to determine field types and optionality. */
function analyzeFields(items: unknown[], allItems?: unknown[]): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();
  const itemCount = items.length;
  const contextItems = allItems ?? items;

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (!fields.has(key) && value !== null) {
        fields.set(key, createFieldInfo(key, value, contextItems));
      } else if (!fields.has(key) && value === null) {
        // Try to find non-null value in other items
        for (const otherItem of contextItems) {
          if (typeof otherItem !== 'object' || otherItem === null) continue;
          const otherRecord = otherItem as Record<string, unknown>;
          if (key in otherRecord && otherRecord[key] !== null) {
            fields.set(key, createFieldInfo(key, otherRecord[key], contextItems));
            break;
          }
        }
        // If still not found, create with null type
        if (!fields.has(key)) {
          fields.set(key, { name: key, type: 'z.null()', optional: false, nullable: true });
        }
      }
    }
  }

  // Mark fields as optional if not present in all items
  for (const [key, info] of fields) {
    const presentCount = items.filter(
      item => typeof item === 'object' && item !== null && key in item
    ).length;
    info.optional = presentCount < itemCount;
  }

  return fields;
}

function capitalize(str: string): string {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Generates Zod schema code from sample data. */
export function generateZodSchema(name: string, items: unknown[]): string {
  if (items.length === 0) return '';

  const fields = analyzeFields(items);
  const nestedSchemas: string[] = [];
  const nestedTypes: string[] = [];

  /** Process fields and generate nested schemas. */
  function processFields(fieldMap: Map<string, FieldInfo>, parentName: string): void {
    for (const [key, info] of fieldMap) {
      // Handle nested objects
      if (info.nestedFields && info.nestedFields.size > 0) {
        const nestedName = `${parentName}${capitalize(key)}`;
        info.type = nestedName + 'Schema';
        processFields(info.nestedFields, nestedName);

        const nestedFieldStrs = Array.from(info.nestedFields.entries())
          .map(([k, v]) => {
            let typeStr = v.type;
            if (v.nullable && !typeStr.includes('.nullable()')) {
              typeStr = typeStr.replace(/\)$/, '.nullable())');
              if (!typeStr.includes('.nullable()')) {
                typeStr = typeStr + '.nullable()';
              }
            }
            if (v.optional) {
              typeStr = typeStr + '.optional()';
            }
            return `  ${k}: ${typeStr},`;
          })
          .join('\n');

        nestedSchemas.push(
          `export const ${nestedName}Schema = z.object({\n${nestedFieldStrs}\n});`
        );
        nestedTypes.push(`export type ${nestedName} = z.infer<typeof ${nestedName}Schema>;`);
      }

      // Handle array elements that are objects
      if (info.arrayElementFields && info.arrayElementFields.size > 0) {
        // Singularize: locations -> Location, rewards -> Reward
        const singular = capitalize(key).replace(/s$/, '');
        const elementName = `${parentName}${singular}`;
        info.type = `z.array(${elementName}Schema)`;
        processFields(info.arrayElementFields, elementName);

        const elementFieldStrs = Array.from(info.arrayElementFields.entries())
          .map(([k, v]) => {
            let typeStr = v.type;
            if (v.nullable && !typeStr.includes('.nullable()')) {
              typeStr = typeStr + '.nullable()';
            }
            if (v.optional) {
              typeStr = typeStr + '.optional()';
            }
            return `  ${k}: ${typeStr},`;
          })
          .join('\n');

        nestedSchemas.push(
          `export const ${elementName}Schema = z.object({\n${elementFieldStrs}\n});`
        );
        nestedTypes.push(`export type ${elementName} = z.infer<typeof ${elementName}Schema>;`);
      }
    }
  }

  processFields(fields, name);

  // Generate main schema
  const mainFieldStrs = Array.from(fields.entries())
    .map(([key, info]) => {
      let typeStr = info.type;
      if (info.nullable && !typeStr.includes('.nullable()') && !typeStr.includes('Schema')) {
        typeStr = typeStr + '.nullable()';
      }
      if (info.optional) {
        typeStr = typeStr + '.optional()';
      }
      return `  ${key}: ${typeStr},`;
    })
    .join('\n');

  const mainSchema = `export const ${name}Schema = z.object({\n${mainFieldStrs}\n});`;
  const mainType = `export type ${name} = z.infer<typeof ${name}Schema>;`;

  const header =
    "// Auto-generated by @skippy/cache - do not edit manually\n\nimport { z } from 'zod';\n";

  return [header, ...nestedSchemas, mainSchema, '', ...nestedTypes, mainType, ''].join('\n');
}

/** Writes Zod schema to a file. */
export async function writeZodSchema(content: string, outputPath: string): Promise<void> {
  await Bun.write(outputPath, content);
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test apps/cache/test/generate-zod-schemas.test.ts`
Expected: PASS

**Step 5: Run typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/cache/src/generate-zod-schemas.ts apps/cache/test/generate-zod-schemas.test.ts
git commit -m "$(cat <<'EOF'
feat(cache): add generateZodSchema for full schema generation

Generates complete Zod schema files from data arrays including:
- Nested object schemas with proper naming
- Array element schemas (singularized names)
- Optional and nullable field handling
- Type exports via z.infer
EOF
)"
```

---

## Task 4: Generate Schemas for All Endpoints

Run the generator against actual fixture data to produce schema files.

**Files:**

- Create: `packages/shared/src/schemas/items.ts` (generated)
- Create: `packages/shared/src/schemas/arcs.ts` (generated)
- Create: `packages/shared/src/schemas/quests.ts` (generated)
- Create: `packages/shared/src/schemas/traders.ts` (generated)
- Create: `packages/shared/src/schemas/events.ts` (generated)
- Create: `packages/shared/src/schemas/index.ts`

**Step 1: Create schemas directory and index**

```typescript
// packages/shared/src/schemas/index.ts
export * from './items';
export * from './arcs';
export * from './quests';
export * from './traders';
export * from './events';
export * from './utils';
```

**Step 2: Generate schemas from production data**

Run: `bun run skippy cache` (to ensure data/ has latest)

Then create a script to generate schemas:

```bash
# Generate each schema file by reading data.json files
bun -e "
import { generateZodSchema } from './apps/cache/src/generate-zod-schemas';
import { mkdir } from 'node:fs/promises';

const endpoints = ['items', 'arcs', 'quests', 'traders', 'events'];
const typeNames = { items: 'Item', arcs: 'Arc', quests: 'Quest', traders: 'Trader', events: 'Event' };

await mkdir('packages/shared/src/schemas', { recursive: true });

for (const endpoint of endpoints) {
  const data = await Bun.file(\`data/\${endpoint}/data.json\`).json();
  const schema = generateZodSchema(typeNames[endpoint], data);
  await Bun.write(\`packages/shared/src/schemas/\${endpoint}.ts\`, schema);
  console.log(\`Generated: packages/shared/src/schemas/\${endpoint}.ts\`);
}
"
```

**Step 3: Verify generated schemas compile**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit generated schemas**

```bash
git add packages/shared/src/schemas/
git commit -m "$(cat <<'EOF'
feat(shared): add generated Zod schemas for all entities

Generated from production data:
- ItemSchema with nested StatBlock, Location, GuideLink schemas
- ArcSchema (simple flat structure)
- QuestSchema with Objective, Reward, GrantedItem, RequiredItem schemas
- TraderSchema with nested items
- EventSchema (flat structure)
EOF
)"
```

---

## Task 5: Wire Generator into Cache Pipeline

Replace generate-types step with generate-zod-schemas.

**Files:**

- Modify: `apps/cache/src/index.ts`
- Modify: `apps/cache/test/index.test.ts`

**Step 1: Update cache index to use Zod generator**

Replace the imports and step 5 in `apps/cache/src/index.ts`:

```typescript
// Replace this import:
// import { generateTypeScript } from './generate-types';
// With:
import { generateZodSchema } from './generate-zod-schemas';

// In runCache(), replace step 5 (lines ~115-125):
// OLD:
//   if (opts.generateTypes && data.length > 0) {
//     const typeName = endpointToTypeName(endpoint);
//     const types = generateTypeScript(typeName, data);
//     const typesDir = join('packages/shared/src/types');
//     ...
//   }
// NEW:
// 5. Generate Zod schemas (if enabled)
if (opts.generateTypes && data.length > 0) {
  const typeName = endpointToTypeName(endpoint);
  const schema = generateZodSchema(typeName, data);
  const schemasDir = join('packages/shared/src/schemas');
  await mkdir(schemasDir, { recursive: true });
  const schemaPath = join(schemasDir, `${endpoint}.ts`);
  await atomicWrite(schemaPath, schema);
  endpointLogger.success(`Generated schema: ${typeName}Schema`);
}
```

**Step 2: Update or remove step 3 (schema.json generation)**

Remove the schema.json generation since we're extracting fields from Zod:

```typescript
// Remove or comment out lines ~93-97:
//   const schema = generateSchema(data);
//   const schemaPath = join(endpointDir, 'schema.json');
//   await atomicWrite(schemaPath, ensureTrailingNewline(JSON.stringify(schema, null, 2)));
//   endpointLogger.success(`Generated schema with ${schema.fields.length} fields`);
```

**Step 3: Remove the generate-schema import**

```typescript
// Remove this import:
// import { generateSchema } from './generate-schema';
```

**Step 4: Update tests**

Update `apps/cache/test/index.test.ts` to expect schema files not types files.

**Step 5: Run tests**

Run: `bun test apps/cache/`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/cache/src/index.ts apps/cache/test/index.test.ts
git commit -m "$(cat <<'EOF'
refactor(cache): replace TypeScript types with Zod schemas

- Step 5 now generates Zod schemas to packages/shared/src/schemas/
- Removed schema.json generation (fields extracted from Zod at runtime)
- Updated tests to expect new output
EOF
)"
```

---

## Task 6: Update MCP Data Loader to Use Zod Parsing

Replace `as Type[]` casts with Zod `.parse()`.

**Files:**

- Modify: `apps/mcp-server/src/loaders/data-loader.ts`
- Modify: `apps/mcp-server/test/loaders/data-loader.test.ts` (create if needed)

**Step 1: Write test for validation on load**

```typescript
// apps/mcp-server/test/loaders/data-loader.test.ts
import { describe, test, expect } from 'vitest';
import { z } from 'zod';

describe('data-loader validation', () => {
  test('throws ZodError for invalid data', () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const invalidData = [{ id: 123, name: 'test' }]; // id should be string

    expect(() => z.array(ItemSchema).parse(invalidData)).toThrow();
  });

  test('parses valid data successfully', () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const validData = [{ id: '1', name: 'test' }];

    const result = z.array(ItemSchema).parse(validData);
    expect(result).toEqual(validData);
  });
});
```

**Step 2: Run tests**

Run: `bun test apps/mcp-server/test/loaders/data-loader.test.ts`
Expected: PASS (this just tests Zod behavior)

**Step 3: Update data-loader.ts**

```typescript
// apps/mcp-server/src/loaders/data-loader.ts

// Add imports at top:
import { z } from 'zod';
import { ItemSchema, ArcSchema, QuestSchema, TraderSchema, EventSchema } from '@skippy/shared';

// Add schema mapping after ENDPOINT_CONFIGS:
const ENTITY_SCHEMAS: Record<SearchEndpointType, z.ZodArray<z.ZodTypeAny>> = {
  [Endpoint.ITEMS]: z.array(ItemSchema),
  [Endpoint.ARCS]: z.array(ArcSchema),
  [Endpoint.QUESTS]: z.array(QuestSchema),
  [Endpoint.TRADERS]: z.array(TraderSchema),
};

// In loadAllData, replace line 68:
// OLD: const data = (await dataFile.json()) as SearchableEntity[];
// NEW:
const rawData = await dataFile.json();
const data = ENTITY_SCHEMAS[endpoint].parse(rawData) as SearchableEntity[];

// And for events (line ~105):
// OLD: const events = (await eventsFile.json()) as Event[];
// NEW:
const rawEvents = await eventsFile.json();
const events = z.array(EventSchema).parse(rawEvents);
```

**Step 4: Run all MCP tests**

Run: `bun test apps/mcp-server/`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp-server/src/loaders/data-loader.ts apps/mcp-server/test/loaders/
git commit -m "$(cat <<'EOF'
feat(mcp-server): validate data with Zod on load

Replace unsafe 'as Type[]' casts with Zod schema parsing.
Data is now validated at startup - malformed JSON fails fast.
EOF
)"
```

---

## Task 7: Update MCP Schema Utility

Replace schema.json loading with extractFieldPaths from Zod.

**Files:**

- Modify: `apps/mcp-server/src/utils/schema.ts`
- Modify: `apps/mcp-server/test/utils/schema.test.ts`

**Step 1: Update schema.ts**

```typescript
// apps/mcp-server/src/utils/schema.ts
import { Endpoint } from '@skippy/shared';
import {
  ItemSchema,
  ArcSchema,
  QuestSchema,
  TraderSchema,
  EventSchema,
  extractFieldPaths,
} from '@skippy/shared';
import { z } from 'zod';

export interface Schema {
  fields: string[];
}

const ENTITY_SCHEMAS: Record<Endpoint, z.ZodObject<z.ZodRawShape>> = {
  [Endpoint.ITEMS]: ItemSchema,
  [Endpoint.ARCS]: ArcSchema,
  [Endpoint.QUESTS]: QuestSchema,
  [Endpoint.TRADERS]: TraderSchema,
  [Endpoint.EVENTS]: EventSchema,
};

export function loadSchema(_dataDir: string, endpoint: Endpoint): Schema {
  const zodSchema = ENTITY_SCHEMAS[endpoint];
  const fields = extractFieldPaths(zodSchema);
  return { fields };
}

export function validateFields(schema: Schema, requestedFields: string[]): void {
  if (requestedFields.length === 0) {
    return;
  }

  const validFields = new Set(schema.fields);

  for (const field of requestedFields) {
    if (!validFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }
}
```

**Step 2: Update data-loader to use sync loadSchema**

Note: `loadSchema` is now sync (no file I/O), update callers if needed.

**Step 3: Run tests**

Run: `bun test apps/mcp-server/`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/mcp-server/src/utils/schema.ts apps/mcp-server/test/utils/schema.test.ts
git commit -m "$(cat <<'EOF'
refactor(mcp-server): extract field paths from Zod schemas

Replace schema.json file loading with extractFieldPaths().
Fields are now derived from Zod schemas at runtime.
EOF
)"
```

---

## Task 8: Update Shared Package Exports

Update index.ts to export schemas and maintain backward compatibility.

**Files:**

- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Update types/index.ts to re-export from schemas**

```typescript
// packages/shared/src/types/index.ts
export * from './search';

// Re-export types from schemas for backward compatibility
export type { Item } from '../schemas/items';
export type { Arc } from '../schemas/arcs';
export type { Quest } from '../schemas/quests';
export type { Trader } from '../schemas/traders';
export type { Event } from '../schemas/events';

// Union types
import type { Item } from '../schemas/items';
import type { Arc } from '../schemas/arcs';
import type { Quest } from '../schemas/quests';
import type { Trader } from '../schemas/traders';
import type { Event } from '../schemas/events';

export type SearchableEntity = Item | Arc | Quest | Trader;
export type GameEntity = Item | Arc | Quest | Trader | Event;
```

**Step 2: Add schemas export to main index**

```typescript
// packages/shared/src/index.ts (add near top)
export * from './schemas';
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/src/types/index.ts
git commit -m "$(cat <<'EOF'
refactor(shared): export schemas and re-export types for compatibility

Types now come from Zod schemas via z.infer.
Backward compatible: existing imports still work.
EOF
)"
```

---

## Task 9: Remove CLI --no-types Flag

Remove the flag from cache command.

**Files:**

- Modify: `apps/cli/src/commands/cache.ts`

**Step 1: Update cache.ts**

```typescript
// apps/cli/src/commands/cache.ts
// Remove line 12: .option('--no-types', 'Skip TypeScript type generation')
// Remove line 34: generateTypes: options.types,
```

The command should now only have `--data-dir` and `--no-fixtures` options.

**Step 2: Run CLI to verify**

Run: `bun run skippy cache --help`
Expected: No `--no-types` option listed

**Step 3: Commit**

```bash
git add apps/cli/src/commands/cache.ts
git commit -m "$(cat <<'EOF'
refactor(cli): remove --no-types flag from cache command

Zod schemas are always generated as they're required for validation.
EOF
)"
```

---

## Task 10: Delete Old Files

Remove deprecated type generation and schema.json files.

**Files:**

- Delete: `apps/cache/src/generate-types.ts`
- Delete: `apps/cache/src/generate-schema.ts`
- Delete: `apps/cache/test/generate-types.test.ts`
- Delete: `apps/cache/test/generate-schema.test.ts`
- Delete: `packages/shared/src/types/items.ts`
- Delete: `packages/shared/src/types/arcs.ts`
- Delete: `packages/shared/src/types/quests.ts`
- Delete: `packages/shared/src/types/traders.ts`
- Delete: `packages/shared/src/types/events.ts`
- Delete: `data/*/schema.json` (all 5)

**Step 1: Delete files**

```bash
rm apps/cache/src/generate-types.ts
rm apps/cache/src/generate-schema.ts
rm apps/cache/test/generate-types.test.ts
rm apps/cache/test/generate-schema.test.ts
rm packages/shared/src/types/items.ts
rm packages/shared/src/types/arcs.ts
rm packages/shared/src/types/quests.ts
rm packages/shared/src/types/traders.ts
rm packages/shared/src/types/events.ts
rm data/*/schema.json
```

**Step 2: Run full test suite**

Run: `bun test`
Expected: PASS

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove deprecated type generators and schema.json files

Superseded by Zod schema generation:
- generate-types.ts → generate-zod-schemas.ts
- generate-schema.ts → extractFieldPaths from Zod
- Individual type files → schemas/*.ts with z.infer
- schema.json files → derived from Zod at runtime
EOF
)"
```

---

## Task 11: Audit Shared Code

Check for code that should be in `@skippy/shared` but isn't.

**Files:**

- Audit all apps/\*/src/ for duplicated utilities

**Step 1: Search for duplicated patterns**

```bash
# Check for duplicate type definitions
rg "interface.*\{" apps/*/src --type ts | grep -v test

# Check for duplicate utility functions
rg "^export function" apps/*/src --type ts | grep -v test
```

**Step 2: Identify candidates for shared**

Common candidates:

- Type definitions used across packages
- Utility functions (formatters, validators)
- Constants

**Step 3: Document findings**

If any found, create tasks to move them. Otherwise note "audit complete, no issues".

**Step 4: Commit any moves**

```bash
git add -A
git commit -m "chore: audit shared code (no changes needed)" # or describe changes
```

---

## Task 12: Final Verification

Run full test suite and verify everything works.

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `bun run lint`
Expected: No errors

**Step 4: Test cache command**

Run: `bun run skippy cache`
Expected: Completes successfully, generates schema files

**Step 5: Test MCP server starts**

Run: `bun run skippy mcp` (Ctrl+C after it starts)
Expected: Server starts, data validated, no errors

**Step 6: Final commit if needed**

```bash
git status  # Should be clean
```
