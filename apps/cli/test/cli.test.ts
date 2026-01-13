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

  test('cache command has data-dir option', () => {
    const cacheCmd = createCacheCommand();
    const options = cacheCmd.options;
    const dataDirOption = options.find(opt => opt.long === '--data-dir');
    expect(dataDirOption).toBeDefined();
  });

  test('mcp command has data-dir option', () => {
    const mcpCmd = createMcpCommand();
    const options = mcpCmd.options;
    const dataDirOption = options.find(opt => opt.long === '--data-dir');
    expect(dataDirOption).toBeDefined();
  });

  test('cache command has no-fixtures option', () => {
    const cacheCmd = createCacheCommand();
    const options = cacheCmd.options;
    const noFixturesOption = options.find(opt => opt.long === '--no-fixtures');
    expect(noFixturesOption).toBeDefined();
  });
});
