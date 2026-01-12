import { describe, test, expect } from 'vitest';
import { createServer, ServerContext } from '../src/server';
import { Config, Logger } from '@skippy/shared';

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
});
