import { describe, test, expect, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { ToolName } from '@skippy/shared';
import { toolRegistry } from '../../src/tools/registry';

describe('ToolRegistry - getToolDefinitionsWithSchemas (real file loading)', () => {
  const dataDir = resolve(import.meta.dirname, '../fixtures');
  const schemaCache = new Map();

  afterEach(() => {
    schemaCache.clear();
  });

  test('loads schema from real files and includes all fields in description', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);

    const searchItems = tools.find(t => t.name === ToolName.SEARCH_ITEMS);
    expect(searchItems).toBeDefined();
    expect(searchItems?.description).toContain('Available fields:');
    expect(searchItems?.description).toContain('id');
    expect(searchItems?.description).toContain('name');
    expect(searchItems?.description).toContain('description');
    expect(searchItems?.description).toContain('stat_block.damage');
    expect(searchItems?.description).toContain('stat_block.health');
  });

  test('search_items tool shows all 5 fields from items.schema.json', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    const searchItems = tools.find(t => t.name === ToolName.SEARCH_ITEMS);

    expect(searchItems).toBeDefined();
    expect(searchItems?.description).toContain(
      'Available fields: id, name, description, stat_block.damage, stat_block.health.'
    );
  });

  test('search_arcs tool shows all fields from arcs.schema.json', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    const searchArcs = tools.find(t => t.name === ToolName.SEARCH_ARCS);

    expect(searchArcs).toBeDefined();
    expect(searchArcs?.description).toContain('Available fields:');
    expect(searchArcs?.description).toContain(
      'id, name, description, threat_level, behavior_pattern, weaknesses.'
    );
  });

  test('search_quests tool shows all fields from quests.schema.json', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    const searchQuests = tools.find(t => t.name === ToolName.SEARCH_QUESTS);

    expect(searchQuests).toBeDefined();
    expect(searchQuests?.description).toContain('Available fields:');
    expect(searchQuests?.description).toContain(
      'id, name, objectives, rewards, requirements, trader_id.'
    );
  });

  test('search_traders tool shows all fields from traders.schema.json', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    const searchTraders = tools.find(t => t.name === ToolName.SEARCH_TRADERS);

    expect(searchTraders).toBeDefined();
    expect(searchTraders?.description).toContain('Available fields:');
    expect(searchTraders?.description).toContain(
      'id, name, inventory, location, reputation_requirements.'
    );
  });

  test('get_events tool shows all fields from events.schema.json', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    const getEvents = tools.find(t => t.name === ToolName.GET_EVENTS);

    expect(getEvents).toBeDefined();
    expect(getEvents?.description).toContain('Available fields:');
    expect(getEvents?.description).toContain('id, name, schedule, rewards, duration, start_time.');
  });

  test('schema is cached after first load', async () => {
    await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);
    expect(schemaCache.has('items')).toBe(true);
    expect(schemaCache.has('arcs')).toBe(true);
    expect(schemaCache.has('quests')).toBe(true);
    expect(schemaCache.has('traders')).toBe(true);
    expect(schemaCache.has('events')).toBe(true);
  });

  test('all 5 tools are returned with real schema data', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);

    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toEqual([
      ToolName.SEARCH_ITEMS,
      ToolName.SEARCH_ARCS,
      ToolName.SEARCH_QUESTS,
      ToolName.SEARCH_TRADERS,
      ToolName.GET_EVENTS,
    ]);
  });

  test('each tool description includes field list without truncation', async () => {
    const tools = await toolRegistry.getToolDefinitionsWithSchemas(dataDir, schemaCache);

    for (const tool of tools) {
      expect(tool.description).toContain('Available fields:');
      const fieldListMatch = tool.description.match(/Available fields: [^.]+\./);
      expect(fieldListMatch).not.toBeNull();
      if (fieldListMatch) {
        const fieldList = fieldListMatch[0];
        expect(fieldList).not.toContain('and');
        expect(fieldList).not.toContain('more');
      }
    }
  });
});
