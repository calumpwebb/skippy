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
