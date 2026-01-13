# Zod Schema Generation

## Problem

Data files are loaded with `as Type[]` casts - no runtime validation. If JSON structure diverges from types, we get silent failures.

## Proposal

Generate Zod schemas during cache instead of (or alongside) TypeScript interfaces. Validate data on MCP server startup.

## Changes

### 1. Schema Generator (`apps/cache/src/generate-schema.ts`)

Replace current TS interface generation with Zod schema generation:

```typescript
// Output: packages/shared/src/schemas/items.ts
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ...
});

export type Item = z.infer<typeof ItemSchema>;
```

### 2. Startup Validation (`apps/mcp-server/src/validate.ts`)

```typescript
export async function validateAllData(dataDir: string): Promise<void> {
  // Load and validate each endpoint's data.json against its schema
  // Fail fast with clear errors if validation fails
}
```

### 3. Hook Into MCP Startup (`apps/mcp-server/src/index.ts`)

```typescript
await validateAllData(config.dataDir);
await startServer(context);
```

## Open Questions

1. **Eager vs lazy validation?** Validate all on startup, or keep lazy loading and validate per-endpoint on first use?
2. **Strictness?** Use `.strict()` to reject unknown fields, or `.passthrough()` to allow extras?
3. **Error handling?** Fail hard on startup, or warn and continue with partial data?

## Alternatives Considered

- **JSON Schema + ajv**: Could use existing `schema.json` files, but Zod is already in the codebase and gives us types for free.
