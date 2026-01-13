import { describe, test, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { ToolName, Endpoint } from '@skippy/shared';
import { toolRegistry } from '../../src/tools/registry';
import { loadSchema, Schema } from '../../src/utils/schema';

describe('ToolRegistry - getToolDefinitionsWithSchemas (real file loading)', () => {
  const dataDir = resolve(import.meta.dirname, '../fixtures');
  let schemas: Record<Endpoint, Schema>;

  beforeAll(async () => {
    // Load all schemas from test fixtures
    schemas = {
      [Endpoint.ITEMS]: await loadSchema(dataDir, Endpoint.ITEMS),
      [Endpoint.ARCS]: await loadSchema(dataDir, Endpoint.ARCS),
      [Endpoint.QUESTS]: await loadSchema(dataDir, Endpoint.QUESTS),
      [Endpoint.TRADERS]: await loadSchema(dataDir, Endpoint.TRADERS),
      [Endpoint.EVENTS]: await loadSchema(dataDir, Endpoint.EVENTS),
    };
  });

  test('loads schema from real files and includes all fields in description', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);

    const searchItems = tools.find(t => t.name === ToolName.SEARCH_ITEMS);
    expect(searchItems).toBeDefined();
    expect(searchItems?.description).toContain('Available fields:');
    expect(searchItems?.description).toContain('id');
    expect(searchItems?.description).toContain('name');
    expect(searchItems?.description).toContain('description');
    expect(searchItems?.description).toContain('stat_block.damage');
    expect(searchItems?.description).toContain('stat_block.health');
  });

  test('search_items tool shows all 5 fields from items.schema.json', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchItems = tools.find(t => t.name === ToolName.SEARCH_ITEMS);

    expect(searchItems).toBeDefined();
    expect(searchItems?.description).toContain(
      'Available fields: id, name, description, stat_block.damage, stat_block.health.'
    );
  });

  test('search_arcs tool shows all fields from arcs.schema.json', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchArcs = tools.find(t => t.name === ToolName.SEARCH_ARCS);

    expect(searchArcs).toBeDefined();
    expect(searchArcs?.description).toContain('Available fields:');
    expect(searchArcs?.description).toContain(
      'id, name, description, threat_level, behavior_pattern, weaknesses.'
    );
  });

  test('search_quests tool shows all fields from quests.schema.json', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchQuests = tools.find(t => t.name === ToolName.SEARCH_QUESTS);

    expect(searchQuests).toBeDefined();
    expect(searchQuests?.description).toContain('Available fields:');
    expect(searchQuests?.description).toContain(
      'id, name, objectives, rewards, requirements, trader_id.'
    );
  });

  test('search_traders tool shows all fields from traders.schema.json', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchTraders = tools.find(t => t.name === ToolName.SEARCH_TRADERS);

    expect(searchTraders).toBeDefined();
    expect(searchTraders?.description).toContain('Available fields:');
    expect(searchTraders?.description).toContain(
      'id, name, inventory, location, reputation_requirements.'
    );
  });

  test('get_events tool shows all fields from events.schema.json', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const getEvents = tools.find(t => t.name === ToolName.GET_EVENTS);

    expect(getEvents).toBeDefined();
    expect(getEvents?.description).toContain('Available fields:');
    expect(getEvents?.description).toContain('id, name, schedule, rewards, duration, start_time.');
  });

  test('all 5 tools are returned with real schema data', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);

    expect(tools).toHaveLength(5);
    expect(tools.map(t => t.name)).toEqual([
      ToolName.SEARCH_ITEMS,
      ToolName.SEARCH_ARCS,
      ToolName.SEARCH_QUESTS,
      ToolName.SEARCH_TRADERS,
      ToolName.GET_EVENTS,
    ]);
  });

  test('each tool description includes field list without truncation', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);

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
