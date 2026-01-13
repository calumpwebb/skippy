# Skippy Agent Instructions

## Project Context

This is Skippy - an Arc Raiders game data cache and MCP server.

### Key Components

- `apps/cache/` - Downloads and processes game data from MetaForge API
- `apps/mcp-server/` - MCP server with 5 search tools
- `apps/cli/` - CLI interface (`skippy cache`, `skippy mcp`)
- `packages/search/` - Hybrid search (semantic + fuzzy)
- `packages/shared/` - Shared types, config, logger

### Commands

```bash
bun test              # Run all tests
bun run lint          # Lint
bun run typecheck     # Type check
bun run skippy        # Run skippy CLI
```

---

## Development Standards

**YOU MUST use these standards when planning, designing, or implementing code changes, no matter what.**

These aren't suggestions - they're how this codebase works. Violating them creates inconsistency and technical debt.

---

### TDD is Mandatory

- Write tests FIRST, then implementation
- Red → Green → Refactor cycle for every feature
- Tests are the specification - if it's not tested, it doesn't work
- Never commit code without tests

### No Split Brain

- Types defined ONCE in `packages/shared/src/types/`
- Constants/enums defined ONCE in `packages/shared/src/constants.ts`
- Config accessed ONLY through `Config` class (never raw `process.env`)
- If you're duplicating a definition, you're doing it wrong

### Exhaustive by Default

- Use `Record<EnumType, ...>` for mappings - forces handling all cases
- Use `assertNever` in switch defaults - TypeScript catches missing cases
- Tests should fail when new variants added (snapshot lengths, enum iteration)
- Adding a new endpoint/tool MUST fail typecheck until fully wired up

### Types

- NO `any` - ever. Use `unknown` and narrow.
- NO `Record<string, unknown>` when a proper type exists
- Explicit return types on all exported functions
- Strict null checks - handle undefined cases

### Naming

- No abbreviations: `embedding` not `emb`, `configuration` not `cfg`
- Verb functions: `generateSchema()`, `downloadItems()`
- Noun classes: `SchemaGenerator`, `DataLoader`
- No magic strings: use `Endpoint.ITEMS` not `'items'`

### File Structure

- Target 200 lines per file, max 250 (ESLint enforced)
- Flat module structure - avoid deep nesting
- Co-locate related code (handler + its tests + its types)

### Functions

- Parameter order: dependencies → required data → options
- 3+ parameters? Use a named options object
- Max 3 levels of nesting - extract helpers
- Early returns for validation, happy path below

### Testing

- In-memory implementations over mocks - real logic, test data
- Auto-generated fixtures from production data
- Builder pattern for custom scenarios: `itemBuilder({ name: 'Medkit' })`
- Tests must fail when new enum variants added (exhaustive checks)
- Avoid fragile tests: no hardcoded counts, test behavior not implementation

### Zod for Validation

- Zod schemas are source of truth for runtime validation
- Use `.describe()` on fields - extracted for MCP tool documentation
- Base schemas extended by specific tools: `BaseSearchParamsSchema.extend({...})`
- Use `fromZodError()` for human-readable validation errors
- Config validated at startup with Zod - fail fast on invalid env

### Architecture

- Dependency injection: pass `config`, `logger`, `loaders` as parameters
- Precompute at cache time: embeddings, schemas, types - not at runtime
- Atomic file writes: write to temp, then rename
- Binary formats have headers (magic + version) for forward compatibility

### Documentation

- Minimal TSDoc: single-line description on exports
- Types ARE the documentation - don't repeat in comments
- "Why" comments explain decisions, not syntax
