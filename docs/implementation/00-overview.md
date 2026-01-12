# Implementation Overview

**Reference:** See `docs/plans/2026-01-11-arc-raiders-mcp-server-design.md` for all architectural decisions, tech stack rationale, and code patterns. Do NOT duplicate that content here.

---

## Purpose

This document organizes implementation into **waves** that can be executed by junior developers or LLMs working in isolation. Each wave has:
- Clear inputs (what must exist before starting)
- Clear outputs (what must exist when done)
- Isolated work streams that can run in parallel
- TDD checkpoints (tests written FIRST, then implementation)

---

## Wave Dependency Graph

```
Wave 1: Foundation
    ├── 1A: Monorepo Setup (FIRST - everything depends on this)
    ├── 1B: Shared Package [after 1A]
    │   ├── 1B.1: Constants & Types (parallel)
    │   ├── 1B.2: Config Class (parallel)
    │   └── 1B.3: Logger (parallel)
    └── 1C: Tooling Config [after 1A] (parallel with 1B)
           │
           ▼
Wave 2: Data Pipeline [after Wave 1]
    ├── 2A: Download Module (parallel)
    ├── 2B: Schema Generator (parallel)
    ├── 2C: Type Generator [after 2B]
    ├── 2D: Test Fixture Generator [after 2A]
    └── 2E: CLI Entry Point [after 2A-2D]
           │
           ▼
Wave 3: Search Engine [after Wave 2]
    ├── 3A: Similarity Functions (parallel, no deps)
    ├── 3B: Embedding Generator [after 3A]
    ├── 3C: Fuzzy Search (parallel, no deps)
    ├── 3D: Hybrid Search [after 3A, 3B, 3C]
    └── 3E: Index Manager [after 3B]
           │
           ▼
Wave 4: MCP Server [after Wave 3]
    ├── 4A: Server Scaffold (FIRST)
    ├── 4B: Tool Handlers [after 4A] (all 5 parallel)
    │   ├── 4B.1: search_items
    │   ├── 4B.2: search_arcs
    │   ├── 4B.3: search_quests
    │   ├── 4B.4: search_traders
    │   └── 4B.5: get_events
    ├── 4C: Glossary Resource [after 4A] (parallel with 4B)
    └── 4D: Logging Middleware [after 4A] (parallel with 4B, 4C)
           │
           ▼
Wave 5: CLI & Integration [after Wave 4]
    ├── 5A: CLI Commands
    ├── 5B: Integration Tests
    └── 5C: Documentation
```

---

## Parallelization Rules

### Safe to Parallelize
- Tasks marked "(parallel)" within a wave
- Different files in different packages
- Tests and implementation of the SAME module (TDD cycle)

### Must Be Sequential
- Anything with `[after X]` dependency
- Wave N+1 cannot start until Wave N is complete
- Within TDD: test file MUST be written before implementation file

### Conflict Prevention
- Each task owns specific files (listed in wave docs)
- Never modify files outside your task's scope
- If you need something from another task, WAIT for it

---

## TDD Protocol (Mandatory)

Every implementation task follows this exact sequence:

```
1. CREATE test file with failing tests
2. RUN tests → verify they FAIL (red)
3. CREATE implementation file
4. RUN tests → verify they PASS (green)
5. REFACTOR if needed (keep tests green)
6. COMMIT test + implementation together
```

**Violations:**
- Writing implementation before tests = REJECT
- Committing without tests = REJECT
- Tests that pass on first run = SUSPICIOUS (tests might be wrong)

---

## Definition of Done (Per Task)

A task is DONE when:
- [ ] Test file exists at specified path
- [ ] All tests pass
- [ ] Implementation file exists at specified path
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No ESLint errors (`bun run lint`)
- [ ] Exports match specification in wave doc

---

## Wave Documents

| Wave | Document | Can Start When |
|------|----------|----------------|
| 1 | `01-wave-foundation.md` | Immediately |
| 2 | `02-wave-data-pipeline.md` | Wave 1 complete |
| 3 | `03-wave-search-engine.md` | Wave 2 complete |
| 4 | `04-wave-mcp-server.md` | Wave 3 complete |
| 5 | `05-wave-cli-integration.md` | Wave 4 complete |

---

## File Ownership Map

Each task "owns" specific files. Only that task should create/modify those files.

### Wave 1 Ownership
```
1A: turbo.json, package.json (root), tsconfig.json, bunfig.toml
1B.1: packages/shared/src/constants.ts, packages/shared/src/types/
1B.2: packages/shared/src/config.ts
1B.3: packages/shared/src/logger.ts
1C: .eslintrc.json, .prettierrc, .husky/
```

### Wave 2 Ownership
```
2A: apps/cache/src/download.ts
2B: apps/cache/src/generate-schema.ts
2C: apps/cache/src/generate-types.ts
2D: apps/cache/src/generate-test-fixtures.ts
2E: apps/cache/src/index.ts, apps/cache/package.json
```

### Wave 3 Ownership
```
3A: packages/search/src/similarity.ts
3B: packages/search/src/embeddings.ts
3C: packages/search/src/fuzzy.ts
3D: packages/search/src/hybrid.ts
3E: packages/search/src/index-manager.ts
```

### Wave 4 Ownership
```
4A: apps/mcp-server/src/server.ts, apps/mcp-server/src/index.ts
4B.1: apps/mcp-server/src/tools/handlers/search-items.ts
4B.2: apps/mcp-server/src/tools/handlers/search-arcs.ts
4B.3: apps/mcp-server/src/tools/handlers/search-quests.ts
4B.4: apps/mcp-server/src/tools/handlers/search-traders.ts
4B.5: apps/mcp-server/src/tools/handlers/get-events.ts
4C: apps/mcp-server/src/resources/glossary.ts, data/glossary.md
4D: apps/mcp-server/src/middleware/logging.ts
```

### Wave 5 Ownership
```
5A: apps/cli/src/index.ts, apps/cli/package.json
5B: test/integration/
5C: README.md (root)
```

---

## Verification Commands

After each task, run these to verify:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Tests (specific package)
bun test packages/shared
bun test packages/search
bun test apps/cache
bun test apps/mcp-server

# All tests
bun test
```

---

## How to Use These Docs

### If You're a Junior Dev
1. Read the wave doc for your assigned wave
2. Pick a task marked "parallel" or the first sequential task
3. Follow the exact steps in order
4. Run verification commands
5. Commit with message format: `wave-X.Y: description`

### If You're an LLM
1. Read the wave doc completely before starting
2. Execute tasks in dependency order
3. For parallel tasks, complete one fully before starting another
4. Always write test file FIRST
5. Verify each checkpoint before proceeding

### If You're Coordinating
1. Assign non-conflicting tasks to different workers
2. Use the dependency graph to schedule
3. Gate wave transitions on full completion
4. Review TDD compliance (tests exist, tests fail first)
