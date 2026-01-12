import { describe, test, expect } from 'vitest';
import { createServer } from '@skippy/mcp-server';
import type { ServerContext } from '@skippy/mcp-server';
import { toolRegistry } from '@skippy/mcp-server';
import { Config, Logger, ToolName } from '@skippy/shared';

describe('MCP Server Integration', () => {
  test('creates server with all tools', () => {
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

  test('tool registry has all 5 tools', () => {
    const tools = Object.values(ToolName);
    expect(tools.length).toBe(5);

    for (const tool of tools) {
      const handler = toolRegistry.getHandler(tool);
      expect(handler).toBeDefined();
    }
  });

  test('tool registry returns tool definitions', () => {
    const definitions = toolRegistry.getToolDefinitions();
    expect(definitions.length).toBe(5);

    const names = definitions.map(d => d.name);
    expect(names).toContain(ToolName.SEARCH_ITEMS);
    expect(names).toContain(ToolName.SEARCH_ARCS);
    expect(names).toContain(ToolName.SEARCH_QUESTS);
    expect(names).toContain(ToolName.SEARCH_TRADERS);
    expect(names).toContain(ToolName.GET_EVENTS);
  });
});
