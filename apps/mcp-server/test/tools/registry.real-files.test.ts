import { describe, test, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { ToolName, Endpoint } from '@skippy/shared';
import { toolRegistry } from '../../src/tools/registry';
import { loadSchema, Schema } from '../../src/utils/schema';

describe('ToolRegistry - getToolDefinitionsWithSchemas (real file loading)', () => {
  const dataDir = resolve(import.meta.dirname, '../fixtures');
  let schemas: Record<Endpoint, Schema>;

  beforeAll(() => {
    // Load all schemas from Zod schemas
    schemas = {
      [Endpoint.ITEMS]: loadSchema(dataDir, Endpoint.ITEMS),
      [Endpoint.ARCS]: loadSchema(dataDir, Endpoint.ARCS),
      [Endpoint.QUESTS]: loadSchema(dataDir, Endpoint.QUESTS),
      [Endpoint.TRADERS]: loadSchema(dataDir, Endpoint.TRADERS),
      [Endpoint.EVENTS]: loadSchema(dataDir, Endpoint.EVENTS),
    };
  });

  test('search_items tool includes expected fields from ItemSchema', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchItems = tools.find(t => t.name === ToolName.SEARCH_ITEMS);

    expect(searchItems).toBeDefined();
    expect(searchItems?.description).toContain('Available fields:');
    // Check for key fields from ItemSchema
    expect(searchItems?.description).toContain('id');
    expect(searchItems?.description).toContain('name');
    expect(searchItems?.description).toContain('description');
    expect(searchItems?.description).toContain('stat_block.damage');
    expect(searchItems?.description).toContain('stat_block.health');
  });

  test('search_arcs tool includes expected fields from ArcSchema', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchArcs = tools.find(t => t.name === ToolName.SEARCH_ARCS);

    expect(searchArcs).toBeDefined();
    expect(searchArcs?.description).toContain('Available fields:');
    // Check for key fields from ArcSchema
    expect(searchArcs?.description).toContain('id');
    expect(searchArcs?.description).toContain('name');
    expect(searchArcs?.description).toContain('description');
  });

  test('search_quests tool includes expected fields from QuestSchema', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchQuests = tools.find(t => t.name === ToolName.SEARCH_QUESTS);

    expect(searchQuests).toBeDefined();
    expect(searchQuests?.description).toContain('Available fields:');
    // Check for key fields from QuestSchema
    expect(searchQuests?.description).toContain('id');
    expect(searchQuests?.description).toContain('name');
    expect(searchQuests?.description).toContain('objectives');
    expect(searchQuests?.description).toContain('rewards');
  });

  test('search_traders tool includes expected fields from TraderSchema', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const searchTraders = tools.find(t => t.name === ToolName.SEARCH_TRADERS);

    expect(searchTraders).toBeDefined();
    expect(searchTraders?.description).toContain('Available fields:');
    // Check for key fields from TraderSchema
    expect(searchTraders?.description).toContain('name');
    expect(searchTraders?.description).toContain('items');
  });

  test('get_events tool includes expected fields from EventSchema', () => {
    const tools = toolRegistry.getToolDefinitionsWithSchemas(schemas);
    const getEvents = tools.find(t => t.name === ToolName.GET_EVENTS);

    expect(getEvents).toBeDefined();
    expect(getEvents?.description).toContain('Available fields:');
    // Check for key fields from EventSchema
    expect(getEvents?.description).toContain('name');
    expect(getEvents?.description).toContain('startTime');
    expect(getEvents?.description).toContain('endTime');
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
