# Skippy Agent Instructions

## Memory (Kratos MCP)

Kratos MCP provides persistent memory across sessions. Use it proactively.

### When to Save Memories

- Architectural decisions and rationale
- Patterns established in the codebase
- Bug fixes with root cause analysis
- Learnings from implementations
- Project-specific conventions

### How to Save

```
memory_save:
  summary: "Short 1-2 line summary"
  text: "Detailed explanation with context"
  tags: ["architecture", "decisions", "patterns", "bugs", "learnings"]
  paths: ["/relevant/file/paths"]
  importance: 1-5 (5 = critical)
```

### When to Search

- Start of session: `memory_search` or `memory_get_recent` for context
- Before implementing: search for related patterns/decisions
- When stuck: `memory_ask` with natural language questions

### Tag Conventions

| Tag            | Use For                              |
| -------------- | ------------------------------------ |
| `architecture` | System design, structure decisions   |
| `decisions`    | Why something was done a certain way |
| `patterns`     | Reusable code patterns               |
| `bugs`         | Bug fixes and root causes            |
| `learnings`    | Lessons learned, gotchas             |
| `api`          | API design, endpoints                |
| `config`       | Configuration choices                |

### Best Practices

- Save immediately after significant work (don't batch)
- Include file paths for code-related memories
- Higher importance (4-5) for decisions that affect multiple files
- Search before implementing to avoid redoing work

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
skippy cache          # Download game data
skippy mcp            # Start MCP server
```
