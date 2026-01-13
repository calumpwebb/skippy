import { describe, test, expect } from 'vitest';
import { createServer, ServerContext } from '../src/server';
import { Config, Logger, SearchableEntity } from '@skippy/shared';
import { HybridSearcher } from '@skippy/search';
import { Schema } from '../src/utils/schema';

describe('createServer', () => {
  test('exports createServer function', () => {
    expect(typeof createServer).toBe('function');
  });

  test('creates server with context', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
    };

    const server = createServer(context);

    expect(server).toBeDefined();
  });

  test('server has required properties', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
    };

    const server = createServer(context);

    // MCP Server should have close method
    expect(typeof server.close).toBe('function');
  });

  test('searcherCache accepts typed searchers', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
      schemaCache: new Map(),
    };

    const searcher = {} as HybridSearcher<SearchableEntity>;
    context.searcherCache.set('test', searcher);

    expect(context.searcherCache.has('test')).toBe(true);
  });

  test('schemaCache accepts typed schemas', () => {
    const config = new Config({});
    const logger = new Logger(config);
    const context: ServerContext = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
      schemaCache: new Map(),
    };

    const schema: Schema = { fields: ['id', 'name'] };
    context.schemaCache.set('items', schema);

    expect(context.schemaCache.has('items')).toBe(true);
    expect(context.schemaCache.get('items')).toEqual(schema);
  });
});
