# Wave 5: CLI & Integration

**Prerequisites:** Wave 4 complete (MCP server functional)
**Outputs:** CLI tool, integration tests, documentation

---

## Task 5A: CLI Commands

**Depends on:** Wave 4 complete
**Can run parallel with:** 5B, 5C
**Files Created:**

- `apps/cli/src/index.ts`
- `apps/cli/src/commands/cache.ts`
- `apps/cli/src/commands/mcp.ts`
- `apps/cli/test/cli.test.ts`

### TDD Step 1: Write tests FIRST

Create `apps/cli/test/cli.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { program, createCacheCommand, createMcpCommand } from '../src/index';

describe('CLI', () => {
  test('exports program', () => {
    expect(program).toBeDefined();
    expect(program.name()).toBe('skippy');
  });

  test('has cache command', () => {
    const cacheCmd = createCacheCommand();
    expect(cacheCmd.name()).toBe('cache');
  });

  test('has mcp command', () => {
    const mcpCmd = createMcpCommand();
    expect(mcpCmd.name()).toBe('mcp');
  });

  test('cache command has description', () => {
    const cacheCmd = createCacheCommand();
    expect(cacheCmd.description()).toContain('Download');
  });

  test('mcp command has description', () => {
    const mcpCmd = createMcpCommand();
    expect(mcpCmd.description()).toContain('MCP');
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test apps/cli
```

**Expected:** Tests FAIL because files don't exist.

### TDD Step 3: Implement CLI

Create `apps/cli/src/commands/cache.ts`:

```typescript
import { Command } from 'commander';
import { Config, Logger } from '@skippy/shared';
import { runCache } from '@skippy/cache';
import pc from 'picocolors';

/** Creates the cache command. */
export function createCacheCommand(): Command {
  const command = new Command('cache')
    .description('Download and process game data from MetaForge API')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .option('--no-types', 'Skip TypeScript type generation')
    .option('--no-fixtures', 'Skip test fixture generation')
    .action(async options => {
      const config = new Config(process.env);
      const logger = new Logger(config);

      console.log(pc.cyan('╔═══════════════════════════════════════╗'));
      console.log(pc.cyan('║') + '       Skippy Cache Updater           ' + pc.cyan('║'));
      console.log(pc.cyan('╚═══════════════════════════════════════╝'));
      console.log();

      try {
        await runCache(config, logger, {
          dataDir: options.dataDir,
          generateTypes: options.types,
          generateFixtures: options.fixtures,
        });

        console.log();
        console.log(pc.green('✓ Cache update complete!'));
      } catch (error) {
        console.error(pc.red('✗ Cache update failed:'), (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
```

Create `apps/cli/src/commands/mcp.ts`:

```typescript
import { Command } from 'commander';
import { Config, Logger } from '@skippy/shared';
import { startServer } from '@skippy/mcp-server';
import pc from 'picocolors';

/** Creates the mcp command. */
export function createMcpCommand(): Command {
  const command = new Command('mcp')
    .description('Start the MCP server for Claude integration')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .action(async options => {
      const config = new Config(process.env);
      const logger = new Logger(config);

      // Don't print banner in MCP mode - stdout is for protocol
      if (process.env.LOG_LEVEL === 'debug') {
        console.error(pc.cyan('Starting Skippy MCP Server...'));
      }

      try {
        await startServer({
          config,
          logger,
          dataDir: options.dataDir,
        });
      } catch (error) {
        console.error(pc.red('MCP server failed:'), (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
```

Create `apps/cli/src/index.ts`:

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { createCacheCommand } from './commands/cache';
import { createMcpCommand } from './commands/mcp';

export const program = new Command()
  .name('skippy')
  .description('Arc Raiders game data tools')
  .version('1.0.0');

export { createCacheCommand, createMcpCommand };

program.addCommand(createCacheCommand());
program.addCommand(createMcpCommand());

// Only parse if run directly (not imported for testing)
if (import.meta.main) {
  program.parse();
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test apps/cli
```

**Expected:** All tests PASS.

### TDD Step 5: Test CLI manually

```bash
# Test help
bun run apps/cli/src/index.ts --help
bun run apps/cli/src/index.ts cache --help
bun run apps/cli/src/index.ts mcp --help

# Test cache command (if Wave 2 data exists)
bun run apps/cli/src/index.ts cache
```

### Checkpoint 5A

- [ ] Tests pass
- [ ] `skippy --help` shows commands
- [ ] `skippy cache` downloads data
- [ ] `skippy mcp` starts server

---

## Task 5B: Integration Tests

**Depends on:** Wave 4 complete
**Can run parallel with:** 5A, 5C
**Files Created:**

- `test/integration/search.test.ts`
- `test/integration/mcp.test.ts`

### TDD Step 1: Create integration test for search

Create `test/integration/search.test.ts`:

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { HybridSearcher, Embedder, loadEmbeddings } from '@skippy/search';
import { Config, Endpoint } from '@skippy/shared';
import { join } from 'node:path';

describe('Search Integration', () => {
  let searcher: HybridSearcher<Record<string, unknown>>;

  beforeAll(async () => {
    const dataPath = './data/items';

    // Load real data
    const dataFile = Bun.file(join(dataPath, 'data.json'));
    const items = (await dataFile.json()) as Record<string, unknown>[];

    // Load real embeddings
    const embeddings = await loadEmbeddings(join(dataPath, 'embeddings.bin'), 384);

    // Create real embedder
    const config = new Config({});
    const embedder = new Embedder({
      modelName: config.embeddingModelName,
      cacheDir: config.embeddingModelCacheDir,
    });
    await embedder.initialize();

    searcher = new HybridSearcher(
      items,
      embeddings,
      embedder,
      Endpoint.ITEMS,
      ['name', 'description', 'item_type'],
      'id'
    );
  }, 120000); // 2 min timeout for model download

  test('finds items by exact name', async () => {
    const results = await searcher.search('Blue Light Stick', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Blue');
  });

  test('finds items by concept', async () => {
    const results = await searcher.search('healing items', 5);

    expect(results.length).toBeGreaterThan(0);
    // Should find medkits, bandages, etc.
  });

  test('handles typos', async () => {
    const results = await searcher.search('medikt', 5); // typo

    expect(results.length).toBeGreaterThan(0);
  });

  test('returns requested number of results', async () => {
    const results = await searcher.search('weapon', 3);

    expect(results.length).toBeLessThanOrEqual(3);
  });
});
```

### TDD Step 2: Create integration test for MCP

Create `test/integration/mcp.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createServer, ServerContext } from '@skippy/mcp-server';
import { Config, Logger, ToolName } from '@skippy/shared';

describe('MCP Server Integration', () => {
  test('creates server with all tools', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
    };

    const server = createServer(context);

    expect(server).toBeDefined();
  });

  test('tool registry has all 5 tools', async () => {
    // Import registry directly
    const { toolRegistry } = await import('@skippy/mcp-server/src/tools/registry');

    const tools = Object.values(ToolName);
    for (const tool of tools) {
      const handler = toolRegistry.getHandler(tool);
      expect(handler).toBeDefined();
    }
  });
});
```

### TDD Step 3: Run integration tests

```bash
bun test test/integration
```

**Expected:** All tests PASS.

### Checkpoint 5B

- [ ] Integration tests pass
- [ ] Search works with real data
- [ ] MCP server creates with all tools

---

## Task 5C: Documentation

**Depends on:** All previous waves
**Can run parallel with:** 5A, 5B
**Files Created/Updated:**

- `README.md` (root)
- `.env.example`

### Step 1: Create README.md

Create/update `README.md`:

````markdown
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
````

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
      "args": ["run", "/path/to/skippy/apps/cli/src/index.ts", "mcp"]
    }
  }
}
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

# With coverage
bun test --coverage
```

### Updating Data

```bash
bun run skippy cache
```

## License

MIT

````

### Step 2: Create .env.example

Create `.env.example`:

```bash
# Logging (debug, info, warn, error)
LOG_LEVEL=info

# Data directory
DATA_DIR=./data

# Embedding model (default works well)
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2
EMBEDDING_MODEL_CACHE_DIR=./models
````

### Checkpoint 5C

- [ ] README.md documents all features
- [ ] Quick start guide is accurate
- [ ] .env.example has all variables

---

## Task 5D: Production Hardening

**Depends on:** Tasks 5A-5C complete
**Files Modified:**

- `apps/cli/src/commands/cache.ts`
- `apps/cli/src/commands/mcp.ts`
- `apps/cli/src/index.ts`
- `test/integration/health.test.ts`

### Step 1: Add path validation utility

Create `apps/cli/src/utils/validate.ts`:

```typescript
import { resolve, isAbsolute } from 'node:path';
import { access, constants } from 'node:fs/promises';

async function validateDataDir(dataDir: string): Promise<string> {
  // Resolve to absolute path
  const resolved = resolve(dataDir);

  // Reject path traversal attempts
  if (dataDir.includes('..')) {
    throw new Error('Path traversal not allowed in --data-dir');
  }

  // Check if directory exists and is writable
  try {
    await access(resolved, constants.W_OK);
  } catch {
    throw new Error(`Data directory not writable: ${resolved}`);
  }

  return resolved;
}
```

### Step 2: Add error type guard helper

Add to `apps/cli/src/utils/validate.ts`:

```typescript
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
```

### Step 3: Update cache command with proper error handling

Update `apps/cli/src/commands/cache.ts`:

```typescript
import { Command } from 'commander';
import { Config, Logger } from '@skippy/shared';
import { runCache } from '@skippy/cache';
import pc from 'picocolors';

export function createCacheCommand(): Command {
  const command = new Command('cache')
    .description('Download and process game data from MetaForge API')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .option('--no-types', 'Skip TypeScript type generation')
    .option('--no-fixtures', 'Skip test fixture generation')
    .action(async options => {
      const config = getConfig();
      const logger = new Logger(config);

      // Validate data directory
      let dataDir: string;
      try {
        dataDir = await validateDataDir(options.dataDir);
      } catch (error) {
        console.error(pc.red('✗'), (error as Error).message);
        process.exitCode = 1;
        return;
      }

      console.log(pc.cyan('╔═══════════════════════════════════════╗'));
      console.log(pc.cyan('║') + '       Skippy Cache Updater           ' + pc.cyan('║'));
      console.log(pc.cyan('╚═══════════════════════════════════════╝'));
      console.log();

      try {
        await runCache(config, logger, {
          dataDir,
          generateTypes: options.types,
          generateFixtures: options.fixtures,
        });

        console.log();
        console.log(pc.green('✓ Cache update complete!'));
      } catch (error) {
        if (error instanceof Error) {
          logger.error('Cache failed', { error: error.message, stack: error.stack });
          console.error(pc.red('✗ Cache update failed:'), error.message);
        } else {
          console.error(pc.red('✗ Cache update failed with unknown error'));
        }
        process.exitCode = 1;
      }
    });

  return command;
}
```

### Step 4: Update MCP command with graceful shutdown

Update `apps/cli/src/commands/mcp.ts`:

```typescript
import { Command } from 'commander';
import { Config, Logger } from '@skippy/shared';
import { startServer } from '@skippy/mcp-server';
import pc from 'picocolors';

export function createMcpCommand(): Command {
  const command = new Command('mcp')
    .description('Start the MCP server for Claude integration')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .action(async options => {
      const config = getConfig();
      const logger = new Logger(config);

      // Validate data directory
      let dataDir: string;
      try {
        dataDir = await validateDataDir(options.dataDir);
      } catch (error) {
        // Log to stderr since stdout is for MCP protocol
        console.error(pc.red('Error:'), (error as Error).message);
        process.exitCode = 1;
        return;
      }

      try {
        const { shutdown } = await startServer({
          config,
          logger,
          dataDir,
          searcherCache: new Map(),
        });

        // Graceful shutdown is now handled by startServer
        // but we can add additional cleanup here if needed
      } catch (error) {
        if (error instanceof Error) {
          console.error('MCP server failed:', error.message);
        } else {
          console.error('MCP server failed with unknown error');
        }
        process.exitCode = 1;
      }
    });

  return command;
}
```

### Step 5: Update index.ts to read version from package.json

Update `apps/cli/src/index.ts`:

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { createCacheCommand } from './commands/cache';
import { createMcpCommand } from './commands/mcp';

// Read version from package.json
const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();

export const program = new Command()
  .name('skippy')
  .description('Arc Raiders game data tools')
  .version(pkg.version);

export { createCacheCommand, createMcpCommand };

program.addCommand(createCacheCommand());
program.addCommand(createMcpCommand());

// Only parse if run directly (not imported for testing)
if (import.meta.main) {
  program.parse();
}
```

### Step 6: Add health check integration test

Create `test/integration/health.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { Config, Logger } from '@skippy/shared';
import { loadEmbeddings } from '@skippy/search';

describe('Server Health', () => {
  test('server initializes with valid data', async () => {
    const config = getConfig();
    const logger = new Logger(config);

    // Verify data files exist
    const itemsFile = Bun.file('./data/items/data.json');
    expect(await itemsFile.exists()).toBe(true);

    // Verify embeddings are loadable
    const { embeddings, dimension } = await loadEmbeddings('./data/items/embeddings.bin');
    expect(dimension).toBe(384);
    expect(embeddings.length).toBeGreaterThan(0);
  });
});
```

### Checkpoint 5D

- [ ] Path validation rejects `..` traversal
- [ ] CLI uses `process.exitCode` instead of `process.exit()`
- [ ] MCP command handles graceful shutdown
- [ ] Version is read from package.json
- [ ] Health check test passes

---

## Wave 5 Complete Checklist

Before marking project DONE, verify ALL:

- [ ] `bun test` - ALL tests pass (unit + integration)
- [ ] `bun run skippy --help` shows usage
- [ ] `bun run skippy cache` downloads data
- [ ] `bun run skippy mcp` starts server
- [ ] MCP Inspector can connect and call tools
- [ ] README.md is complete
- [ ] No TypeScript errors: `bun run typecheck`
- [ ] No ESLint errors: `bun run lint`

---

## Final Verification

Run these commands to verify the project is complete:

```bash
# 1. Clean install
rm -rf node_modules
bun install

# 2. Type check
bun run typecheck

# 3. Lint
bun run lint

# 4. All tests
bun test

# 5. Cache data
bun run skippy cache

# 6. Start MCP and test with inspector
npx @modelcontextprotocol/inspector bun run skippy mcp
```

If all pass: **PROJECT COMPLETE!**

---

## Post-Implementation

### Git Commit Strategy

```bash
# One commit per task
git add .
git commit -m "wave-1A: Initialize monorepo structure"

git add .
git commit -m "wave-1B.1: Add constants and types"

# etc.
```

### Tagging Release

```bash
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```
