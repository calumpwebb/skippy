# Skippy

Arc Raiders game data cache and MCP server for Claude integration.

## Features

- **Semantic Search** - Find items by concept ("healing items", "ranged weapons")
- **Fuzzy Matching** - Handles typos and partial names
- **MCP Integration** - Works with Claude Code and Claude Desktop
- **Offline First** - All data cached locally, no API calls during search

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Git

### Installation

```bash
git clone https://github.com/yourusername/skippy.git
cd skippy
bun install
```

### Download Game Data

```bash
bun run skippy cache
```

This downloads all game data from MetaForge API and generates:

- Data files in `data/`
- TypeScript types in `packages/shared/src/types/`
- Test fixtures in `test/fixtures/`
- Embeddings for semantic search

### Start MCP Server

```bash
bun run skippy mcp
```

### Configure Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "arc-raiders": {
      "command": "bun",
      "args": ["run", "skippy", "mcp"]
    }
  }
}
```

## CLI Commands

```bash
# Show help
bun run skippy --help

# Download and cache game data
bun run skippy cache

# Start MCP server
bun run skippy mcp

# Use custom data directory
bun run skippy cache --data-dir ./custom-data
bun run skippy mcp --data-dir ./custom-data
```

## Available Tools

| Tool             | Description                                      |
| ---------------- | ------------------------------------------------ |
| `search_items`   | Search for items by name, type, or description   |
| `search_arcs`    | Search for ARCs (enemies) by name or description |
| `search_quests`  | Search for quests by name, objectives, or trader |
| `search_traders` | Search for traders and their inventories         |
| `get_events`     | Get current and upcoming game events             |

## Resources

| Resource                 | Description                      |
| ------------------------ | -------------------------------- |
| `arc-raiders://glossary` | Game terminology and definitions |

## Development

### Project Structure

```
skippy/
├── apps/
│   ├── cli/          # CLI entry point
│   ├── cache/        # Data downloader
│   └── mcp-server/   # MCP server
├── packages/
│   ├── shared/       # Types, config, constants
│   └── search/       # Search algorithms
├── data/             # Game data + embeddings
└── test/             # Integration tests
```

### Running Tests

```bash
# All tests
bun test

# Specific package
bun test packages/search
bun test apps/mcp-server
bun test apps/cli

# Integration tests
bun test test/integration

# With coverage
bun test --coverage
```

### Type Checking and Linting

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```

### Updating Data

```bash
bun run skippy cache
```

## Environment Variables

See `.env.example` for available configuration options.

| Variable                    | Default                   | Description                          |
| --------------------------- | ------------------------- | ------------------------------------ |
| `LOG_LEVEL`                 | `info`                    | Log level (debug, info, warn, error) |
| `DATA_DIR`                  | `./data`                  | Data directory path                  |
| `EMBEDDING_MODEL_NAME`      | `Xenova/all-MiniLM-L6-v2` | Embedding model                      |
| `EMBEDDING_MODEL_CACHE_DIR` | `./models`                | Model cache directory                |

## License

MIT
