# Wave 1: Foundation

**Prerequisites:** None - this is the first wave
**Outputs:** Working monorepo with shared package, tooling configured

---

## Task 1A: Monorepo Setup

**Owner:** Single person (blocks everything else)
**Files Created:**
- `package.json` (root)
- `turbo.json`
- `tsconfig.json` (root)
- `bunfig.toml`
- `packages/shared/package.json`
- `packages/search/package.json`
- `apps/cache/package.json`
- `apps/mcp-server/package.json`
- `apps/cli/package.json`

### Step 1: Clean up Python files

```bash
cd /Users/calum/Development/skippy
rm -rf src .venv .ruff_cache pyproject.toml uv.lock .python-version tests
```

### Step 2: Initialize root package.json

Create `package.json`:
```json
{
  "name": "skippy",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "dev": "turbo dev"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0"
  }
}
```

### Step 3: Create turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Step 4: Create root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Step 5: Create bunfig.toml

```toml
[install]
peer = false

[install.lockfile]
save = true
```

### Step 6: Create package directories and package.json files

```bash
mkdir -p packages/shared/src packages/shared/test
mkdir -p packages/search/src packages/search/test
mkdir -p apps/cache/src
mkdir -p apps/mcp-server/src
mkdir -p apps/cli/src
mkdir -p test/fixtures
```

**packages/shared/package.json:**
```json
{
  "name": "@skippy/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "consola": "^3.2.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

**packages/search/package.json:**
```json
{
  "name": "@skippy/search",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@skippy/shared": "workspace:*",
    "@xenova/transformers": "^2.17.0",
    "vectra": "^0.9.0",
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

**apps/cache/package.json:**
```json
{
  "name": "@skippy/cache",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@skippy/shared": "workspace:*",
    "@skippy/search": "workspace:*",
    "cli-progress": "^3.12.0",
    "p-limit": "^5.0.0"
  },
  "devDependencies": {
    "@types/cli-progress": "^3.11.0",
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

**apps/mcp-server/package.json:**
```json
{
  "name": "@skippy/mcp-server",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@skippy/shared": "workspace:*",
    "@skippy/search": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod-to-json-schema": "^3.23.0",
    "zod-validation-error": "^3.3.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

**apps/cli/package.json:**
```json
{
  "name": "@skippy/cli",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "skippy": "./src/index.ts"
  },
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@skippy/shared": "workspace:*",
    "@skippy/cache": "workspace:*",
    "@skippy/mcp-server": "workspace:*",
    "commander": "^12.0.0",
    "picocolors": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

### Step 7: Install dependencies

```bash
bun install
```

### Step 8: Create placeholder index files

Each package needs an `src/index.ts`:

**packages/shared/src/index.ts:**
```typescript
// Shared package - exports will be added by subsequent tasks
export {};
```

**packages/search/src/index.ts:**
```typescript
// Search package - exports will be added by subsequent tasks
export {};
```

### Checkpoint 1A
- [ ] `bun install` succeeds
- [ ] Directory structure exists
- [ ] All package.json files valid

---

## Task 1B.1: Constants & Types

**Depends on:** 1A complete
**Can run parallel with:** 1B.2, 1B.3, 1C
**Files Created:**
- `packages/shared/src/constants.ts`
- `packages/shared/test/constants.test.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/types/search.ts`

### TDD Step 1: Write tests FIRST

Create `packages/shared/test/constants.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { Endpoint, ToolName, LogLevel } from '../src/constants';

describe('Endpoint', () => {
  test('has all required endpoints', () => {
    expect(Endpoint.ITEMS).toBe('items');
    expect(Endpoint.ARCS).toBe('arcs');
    expect(Endpoint.QUESTS).toBe('quests');
    expect(Endpoint.TRADERS).toBe('traders');
    expect(Endpoint.EVENTS).toBe('events');
  });

  test('endpoints are exhaustive (5 total)', () => {
    const endpoints = Object.values(Endpoint);
    expect(endpoints).toHaveLength(5);
  });
});

describe('ToolName', () => {
  test('has all required tool names', () => {
    expect(ToolName.SEARCH_ITEMS).toBe('search_items');
    expect(ToolName.SEARCH_ARCS).toBe('search_arcs');
    expect(ToolName.SEARCH_QUESTS).toBe('search_quests');
    expect(ToolName.SEARCH_TRADERS).toBe('search_traders');
    expect(ToolName.GET_EVENTS).toBe('get_events');
  });

  test('tool names are exhaustive (5 total)', () => {
    const tools = Object.values(ToolName);
    expect(tools).toHaveLength(5);
  });
});

describe('LogLevel', () => {
  test('has all log levels', () => {
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
cd packages/shared
bun test
```

**Expected:** Tests FAIL because `constants.ts` doesn't exist.

### TDD Step 3: Implement constants.ts

Create `packages/shared/src/constants.ts`:

```typescript
/** API endpoint identifiers. */
export const Endpoint = {
  ITEMS: 'items',
  ARCS: 'arcs',
  QUESTS: 'quests',
  TRADERS: 'traders',
  EVENTS: 'events',
} as const;

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint];

/** MCP tool name identifiers. */
export const ToolName = {
  SEARCH_ITEMS: 'search_items',
  SEARCH_ARCS: 'search_arcs',
  SEARCH_QUESTS: 'search_quests',
  SEARCH_TRADERS: 'search_traders',
  GET_EVENTS: 'get_events',
} as const;

export type ToolName = (typeof ToolName)[keyof typeof ToolName];

/** Log level identifiers. */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test
```

**Expected:** All tests PASS.

### TDD Step 5: Create search types

Create `packages/shared/src/types/search.ts`:

```typescript
/** Parameters common to all search tools. */
export interface BaseSearchParams {
  query: string;
  fields?: string[];
  limit?: number;
}

/** Result structure returned by all search tools. */
export interface BaseSearchResult<T> {
  results: T[];
  totalMatches: number;
  query: string;
}

/** Internal search result with score for ranking. */
export interface ScoredResult<T> {
  item: T;
  score: number;
}
```

Create `packages/shared/src/types/index.ts`:

```typescript
export * from './search';
```

### TDD Step 6: Update shared index

Update `packages/shared/src/index.ts`:

```typescript
export * from './constants';
export * from './types';
```

### Checkpoint 1B.1
- [ ] Tests pass: `bun test packages/shared`
- [ ] Exports work: can import `{ Endpoint, ToolName }` from `@skippy/shared`

---

## Task 1B.2: Config Class

**Depends on:** 1A complete
**Can run parallel with:** 1B.1, 1B.3, 1C
**Files Created:**
- `packages/shared/src/config.ts`
- `packages/shared/test/config.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/shared/test/config.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { Config, ConfigSchema, getConfig, resetConfig } from '../src/config';

describe('Config', () => {
  test('uses default values when env is empty (non-production)', () => {
    const config = new Config({});

    expect(config.logLevel).toBe('info');
    expect(config.dataDir).toBe('./data');
    expect(config.embeddingModelName).toBe('Xenova/all-MiniLM-L6-v2');
  });

  test('respects provided environment values', () => {
    const config = new Config({
      LOG_LEVEL: 'debug',
      DATA_DIR: '/custom/data',
      EMBEDDING_MODEL_NAME: 'custom-model',
    });

    expect(config.logLevel).toBe('debug');
    expect(config.dataDir).toBe('/custom/data');
    expect(config.embeddingModelName).toBe('custom-model');
  });

  test('validates log level enum', () => {
    expect(() => new Config({ LOG_LEVEL: 'invalid' })).toThrow();
  });

  test('provides embedding model cache directory', () => {
    const config = new Config({});
    expect(config.embeddingModelCacheDir).toBe('./models');
  });

  test('allows custom embedding cache directory', () => {
    const config = new Config({ EMBEDDING_MODEL_CACHE_DIR: '/tmp/models' });
    expect(config.embeddingModelCacheDir).toBe('/tmp/models');
  });
});

describe('ConfigSchema', () => {
  test('exports schema for validation reuse', () => {
    expect(ConfigSchema).toBeDefined();
    expect(ConfigSchema.parse).toBeInstanceOf(Function);
  });
});

describe('getConfig / resetConfig', () => {
  beforeEach(() => {
    resetConfig();
  });

  test('getConfig returns cached instance', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2);
  });

  test('resetConfig clears cached instance', () => {
    const config1 = getConfig();
    resetConfig();
    const config2 = getConfig();
    expect(config1).not.toBe(config2);
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test config
```

**Expected:** Tests FAIL because `config.ts` doesn't exist.

### TDD Step 3: Implement config.ts

Create `packages/shared/src/config.ts`:

```typescript
import { z } from 'zod';

/** Schema for environment variable validation. */
export const ConfigSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATA_DIR: z.string().default('./data'),
  EMBEDDING_MODEL_NAME: z.string().default('Xenova/all-MiniLM-L6-v2'),
  EMBEDDING_MODEL_CACHE_DIR: z.string().default('./models'),
});

export type ConfigEnv = z.infer<typeof ConfigSchema>;

/** Centralized configuration with validation. */
export class Config {
  private readonly env: ConfigEnv;

  constructor(processEnv: Record<string, string | undefined>) {
    this.env = ConfigSchema.parse(processEnv);
  }

  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }

  get dataDir(): string {
    return this.env.DATA_DIR;
  }

  get embeddingModelName(): string {
    return this.env.EMBEDDING_MODEL_NAME;
  }

  get embeddingModelCacheDir(): string {
    return this.env.EMBEDDING_MODEL_CACHE_DIR;
  }
}

// Lazy initialization - NOT a singleton at module load
let _config: Config | undefined;

/** Get or create the global Config instance. */
export function getConfig(): Config {
  if (!_config) {
    _config = new Config(process.env);
  }
  return _config;
}

/** Reset the global Config instance (useful for testing). */
export function resetConfig(): void {
  _config = undefined;
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test config
```

**Expected:** All tests PASS.

### TDD Step 5: Update shared index

Add to `packages/shared/src/index.ts`:

```typescript
export * from './config';
```

### Checkpoint 1B.2
- [ ] Tests pass: `bun test packages/shared`
- [ ] Can create Config with custom env
- [ ] Validation throws on invalid values

---

## Task 1B.3: Logger

**Depends on:** 1A complete, 1B.2 complete (needs Config)
**Can run parallel with:** 1B.1, 1C
**Files Created:**
- `packages/shared/src/logger.ts`
- `packages/shared/test/logger.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/shared/test/logger.test.ts`:

```typescript
import { describe, test, expect, vi } from 'vitest';
import { Logger } from '../src/logger';
import { Config } from '../src/config';

describe('Logger', () => {
  test('creates logger with context', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const logger = new Logger(config, { component: 'test' });

    expect(logger).toBeDefined();
  });

  test('child logger inherits and extends context', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const parent = new Logger(config, { component: 'parent' });
    const child = parent.child({ operation: 'child-op' });

    expect(child).toBeDefined();
    expect(child).not.toBe(parent);
  });

  test('respects log level - debug not logged at info level', () => {
    const config = new Config({ LOG_LEVEL: 'info' });
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.debug('should not appear');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('logs at appropriate levels', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.info('test message');

    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  test('handles circular references in meta without throwing', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;

    // Should not throw
    expect(() => logger.info('circular test', circular)).not.toThrow();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  test('logs with unknown log level (defensive)', () => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger(config);
    logger.info('test message');

    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test logger
```

**Expected:** Tests FAIL because `logger.ts` doesn't exist.

### TDD Step 3: Implement logger.ts

Create `packages/shared/src/logger.ts`:

```typescript
import { Config } from './config';

const LOG_PRIORITY: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Safely stringify objects, handling circular references. */
function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Circular or non-serializable]';
  }
}

/** Structured logger with context inheritance. */
export class Logger {
  private readonly config: Config;
  private readonly context: Record<string, unknown>;

  constructor(config: Config, context: Record<string, unknown> = {}) {
    this.config = config;
    this.context = context;
  }

  /** Creates child logger with additional context. */
  child(additionalContext: Record<string, unknown>): Logger {
    return new Logger(this.config, { ...this.context, ...additionalContext });
  }

  private shouldLog(level: string): boolean {
    const levelPriority = LOG_PRIORITY[level];
    const configPriority = LOG_PRIORITY[this.config.logLevel];
    if (levelPriority === undefined || configPriority === undefined) {
      return true; // Log if level is unknown
    }
    return levelPriority >= configPriority;
  }

  private formatMessage(message: string, meta?: Record<string, unknown>): string {
    const fullContext = { ...this.context, ...meta };
    const contextStr = Object.keys(fullContext).length > 0
      ? ` ${safeStringify(fullContext)}`
      : '';
    return `${message}${contextStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message, meta));
    }
  }

  success(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`✓ ${this.formatMessage(message, meta)}`);
    }
  }
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test logger
```

**Expected:** All tests PASS.

### TDD Step 5: Update shared index

Add to `packages/shared/src/index.ts`:

```typescript
export * from './logger';
```

### Checkpoint 1B.3
- [ ] Tests pass: `bun test packages/shared`
- [ ] Logger respects log levels
- [ ] Child loggers work
- [ ] Circular references handled safely

---

## Task 1B.4: Signal Handlers

**Depends on:** 1B.3 complete (needs Logger)
**Can run parallel with:** 1C
**Files Created:**
- `packages/shared/src/shutdown.ts`
- `packages/shared/test/shutdown.test.ts`

### TDD Step 1: Write tests FIRST

Create `packages/shared/test/shutdown.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerCleanup, setupGracefulShutdown } from '../src/shutdown';
import { Logger } from '../src/logger';
import { Config } from '../src/config';

// Mock process.exit to prevent test runner from exiting
vi.mock('process', async () => {
  const actual = await vi.importActual('process');
  return {
    ...actual,
    exit: vi.fn(),
  };
});

describe('shutdown', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    const config = new Config({ LOG_LEVEL: 'debug' });
    mockLogger = new Logger(config, { component: 'test' });
  });

  test('registerCleanup adds cleanup function', () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    expect(() => registerCleanup(cleanup)).not.toThrow();
  });

  test('setupGracefulShutdown registers signal handlers', () => {
    const onSpy = vi.spyOn(process, 'on');

    setupGracefulShutdown(mockLogger);

    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    onSpy.mockRestore();
  });
});
```

### TDD Step 2: Run tests - verify RED

```bash
bun test shutdown
```

**Expected:** Tests FAIL because `shutdown.ts` doesn't exist.

### TDD Step 3: Implement shutdown.ts

Create `packages/shared/src/shutdown.ts`:

```typescript
import { Logger } from './logger';

type CleanupFn = () => Promise<void>;
const cleanupHandlers: CleanupFn[] = [];

/** Register a cleanup function to run on shutdown. */
export function registerCleanup(fn: CleanupFn): void {
  cleanupHandlers.push(fn);
}

/** Clear all registered cleanup handlers (useful for testing). */
export function clearCleanupHandlers(): void {
  cleanupHandlers.length = 0;
}

/** Set up graceful shutdown handlers for SIGTERM and SIGINT. */
export function setupGracefulShutdown(logger: Logger): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    for (const cleanup of cleanupHandlers) {
      try {
        await cleanup();
      } catch (error) {
        logger.error('Cleanup failed', { error: (error as Error).message });
      }
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

### TDD Step 4: Run tests - verify GREEN

```bash
bun test shutdown
```

**Expected:** All tests PASS.

### TDD Step 5: Update shared index

Add to `packages/shared/src/index.ts`:

```typescript
export * from './shutdown';
```

### Checkpoint 1B.4
- [ ] Tests pass: `bun test packages/shared`
- [ ] Signal handlers can be registered
- [ ] Cleanup functions are called on shutdown

---

## Task 1C: Tooling Config

**Depends on:** 1A complete
**Can run parallel with:** 1B.1, 1B.2, 1B.3, 1B.4
**Files Created:**
- `.eslintrc.json`
- `.prettierrc`
- `.husky/pre-commit`
- `vitest.config.ts`

### Step 1: Create ESLint config

Create `.eslintrc.json`:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "max-lines": ["error", { "max": 250, "skipBlankLines": true, "skipComments": true }],
    "max-depth": ["error", 3]
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

### Step 2: Create Prettier config

Create `.prettierrc`:

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

### Step 3: Create vitest config

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**', 'apps/*/src/**'],
      exclude: ['**/*.test.ts', '**/test/**'],
    },
  },
});
```

### Step 4: Install ESLint dependencies

```bash
bun add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

### Step 5: Set up Husky

```bash
bun add -D husky lint-staged
bunx husky init
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bun run lint-staged
```

Add to root `package.json`:

```json
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

### Checkpoint 1C
- [ ] `bun run lint` works
- [ ] `bun run test` works
- [ ] Pre-commit hook runs on git commit

---

## Wave 1 Complete Checklist

Before starting Wave 2, verify ALL of the following:

- [ ] `bun install` succeeds with no errors
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun test packages/shared` - all tests pass
- [ ] Can import from `@skippy/shared`:
  ```typescript
  import {
    Config, getConfig, resetConfig,
    Logger,
    Endpoint, ToolName,
    registerCleanup, setupGracefulShutdown
  } from '@skippy/shared';
  ```
- [ ] Directory structure matches design doc
- [ ] Git hooks installed and working

**Wave 1 is DONE. Proceed to Wave 2.**
