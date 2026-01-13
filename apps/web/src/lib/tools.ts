import { tool } from 'ai';
import { z } from 'zod';
import {
  BaseSearchParamsSchema,
  Endpoint,
  ToolName,
  ItemSchema,
  ArcSchema,
  QuestSchema,
  TraderSchema,
  EventSchema,
  extractFieldPaths,
  SearchableEntity,
} from '@skippy/shared';
import type { Item, Arc, Quest, Trader, Event, BaseSearchResult } from '@skippy/shared';
import type { HybridSearcher } from '@skippy/search';

/** Endpoints that support hybrid search (excludes events). */
const SearchEndpoint = [Endpoint.ITEMS, Endpoint.ARCS, Endpoint.QUESTS, Endpoint.TRADERS] as const;

type SearchEndpoint = (typeof SearchEndpoint)[number];

/** Context required by tool handlers. */
export interface ToolContext {
  searchers: Record<SearchEndpoint, HybridSearcher<SearchableEntity>>;
  events: Event[];
}

/** Tool descriptions matching MCP server. */
const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  [ToolName.SEARCH_ITEMS]:
    'Search for items by name, type, or description. Returns matching items with their stats, rarity, and crafting info.',
  [ToolName.SEARCH_ARCS]:
    'Search for ARCs (enemies) by name or description. Returns ARC types with threat levels and behavior info.',
  [ToolName.SEARCH_QUESTS]:
    'Search for quests by name, objectives, or trader. Returns quest details including rewards and requirements.',
  [ToolName.SEARCH_TRADERS]:
    'Search for traders and their inventories. Returns trader info and available items for purchase.',
  [ToolName.GET_EVENTS]:
    'Get current and upcoming game events. Returns event schedules, rewards, and timers.',
};

/** Zod schemas for each endpoint to extract field paths. */
const ENTITY_SCHEMAS: Record<Endpoint, z.ZodObject<z.ZodRawShape>> = {
  [Endpoint.ITEMS]: ItemSchema,
  [Endpoint.ARCS]: ArcSchema,
  [Endpoint.QUESTS]: QuestSchema,
  [Endpoint.TRADERS]: TraderSchema,
  [Endpoint.EVENTS]: EventSchema,
};

/** Cache for available fields per endpoint. */
const fieldsCache = new Map<Endpoint, string[]>();

/** Gets available fields for an endpoint (cached). */
function getAvailableFields(endpoint: Endpoint): string[] {
  if (!fieldsCache.has(endpoint)) {
    fieldsCache.set(endpoint, extractFieldPaths(ENTITY_SCHEMAS[endpoint]));
  }
  return fieldsCache.get(endpoint)!;
}

/** Builds description with available fields appended. */
function buildDescription(toolName: ToolName, endpoint: Endpoint): string {
  const baseDescription = TOOL_DESCRIPTIONS[toolName];
  const fields = getAvailableFields(endpoint);
  return `${baseDescription} Available fields: ${fields.join(', ')}.`;
}

// Field extraction utilities (from MCP server)
const FORBIDDEN_PATHS = ['__proto__', 'constructor', 'prototype'];
const MAX_FIELD_DEPTH = 4;

function validateFieldPath(path: string): void {
  const parts = path.split('.');
  if (parts.length > MAX_FIELD_DEPTH) {
    throw new Error(`Field path too deep: ${path}`);
  }
  for (const part of parts) {
    if (FORBIDDEN_PATHS.includes(part.toLowerCase())) {
      throw new Error(`Invalid field path: ${path}`);
    }
  }
}

function isIndexable(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function getNestedValue<T extends object>(obj: T, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (!isIndexable(current)) return undefined;
    current = current[key];
  }
  return current;
}

function extractFields<T extends object>(entity: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) return entity;
  for (const field of fields) {
    validateFieldPath(field);
  }
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getNestedValue(entity, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result as Partial<T>;
}

function validateFields(endpoint: Endpoint, requestedFields: string[]): void {
  if (requestedFields.length === 0) return;
  const validFields = new Set(getAvailableFields(endpoint));
  for (const field of requestedFields) {
    if (!validFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }
}

/** Creates search result structure. */
function createSearchResult<T>(results: T[], query: string): BaseSearchResult<T> {
  return {
    results,
    totalMatches: results.length,
    query,
  };
}

/** Creates the Vercel AI SDK tools wired to Skippy search. */
export function createSkippyTools(context: ToolContext): Record<ToolName, ReturnType<typeof tool>> {
  return {
    [ToolName.SEARCH_ITEMS]: tool({
      description: buildDescription(ToolName.SEARCH_ITEMS, Endpoint.ITEMS),
      inputSchema: BaseSearchParamsSchema,
      execute: async ({ query, fields, limit }) => {
        if (fields?.length) {
          validateFields(Endpoint.ITEMS, fields);
        }
        const results = await context.searchers[Endpoint.ITEMS].search(query, limit);
        return createSearchResult(
          results.map(item => extractFields(item as Item, fields)),
          query
        );
      },
    }),

    [ToolName.SEARCH_ARCS]: tool({
      description: buildDescription(ToolName.SEARCH_ARCS, Endpoint.ARCS),
      inputSchema: BaseSearchParamsSchema,
      execute: async ({ query, fields, limit }) => {
        if (fields?.length) {
          validateFields(Endpoint.ARCS, fields);
        }
        const results = await context.searchers[Endpoint.ARCS].search(query, limit);
        return createSearchResult(
          results.map(arc => extractFields(arc as Arc, fields)),
          query
        );
      },
    }),

    [ToolName.SEARCH_QUESTS]: tool({
      description: buildDescription(ToolName.SEARCH_QUESTS, Endpoint.QUESTS),
      inputSchema: BaseSearchParamsSchema,
      execute: async ({ query, fields, limit }) => {
        if (fields?.length) {
          validateFields(Endpoint.QUESTS, fields);
        }
        const results = await context.searchers[Endpoint.QUESTS].search(query, limit);
        return createSearchResult(
          results.map(quest => extractFields(quest as Quest, fields)),
          query
        );
      },
    }),

    [ToolName.SEARCH_TRADERS]: tool({
      description: buildDescription(ToolName.SEARCH_TRADERS, Endpoint.TRADERS),
      inputSchema: BaseSearchParamsSchema,
      execute: async ({ query, fields, limit }) => {
        if (fields?.length) {
          validateFields(Endpoint.TRADERS, fields);
        }
        const results = await context.searchers[Endpoint.TRADERS].search(query, limit);
        return createSearchResult(
          results.map(trader => extractFields(trader as Trader, fields)),
          query
        );
      },
    }),

    [ToolName.GET_EVENTS]: tool({
      description: buildDescription(ToolName.GET_EVENTS, Endpoint.EVENTS),
      inputSchema: z.object({}),
      execute: async () => {
        return {
          events: context.events,
          count: context.events.length,
        };
      },
    }),
  };
}

export type SkippyTools = ReturnType<typeof createSkippyTools>;
