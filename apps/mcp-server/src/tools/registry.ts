import { ToolName } from '@skippy/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ServerContext } from '../server';

// Import handlers
import { searchItems, SearchItemsParamsSchema } from './handlers/search-items';
import { searchArcs, SearchArcsParamsSchema } from './handlers/search-arcs';
import { searchQuests, SearchQuestsParamsSchema } from './handlers/search-quests';
import { searchTraders, SearchTradersParamsSchema } from './handlers/search-traders';
import { getEvents, GetEventsParamsSchema } from './handlers/get-events';

export type ToolHandler = (args: unknown, context: ServerContext) => Promise<unknown>;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

class ToolRegistry {
  private handlers = new Map<ToolName, ToolHandler>();
  private schemas = new Map<ToolName, z.ZodType>();
  private descriptions = new Map<ToolName, string>();

  register(name: ToolName, description: string, schema: z.ZodType, handler: ToolHandler): void {
    this.handlers.set(name, handler);
    this.schemas.set(name, schema);
    this.descriptions.set(name, description);
  }

  getHandler(name: ToolName): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const name of Object.values(ToolName)) {
      const schema = this.schemas.get(name);
      const description = this.descriptions.get(name);

      if (schema && description) {
        definitions.push({
          name,
          description,
          inputSchema: zodToJsonSchema(schema) as Record<string, unknown>,
        });
      }
    }

    return definitions;
  }
}

export const toolRegistry = new ToolRegistry();

// Register all tool handlers
toolRegistry.register(
  ToolName.SEARCH_ITEMS,
  'Search for items by name, type, or description. Returns matching items with their stats, rarity, and crafting info.',
  SearchItemsParamsSchema,
  searchItems
);

toolRegistry.register(
  ToolName.SEARCH_ARCS,
  'Search for ARCs (enemies) by name or description. Returns ARC types with threat levels and behavior info.',
  SearchArcsParamsSchema,
  searchArcs
);

toolRegistry.register(
  ToolName.SEARCH_QUESTS,
  'Search for quests by name, objectives, or trader. Returns quest details including rewards and requirements.',
  SearchQuestsParamsSchema,
  searchQuests
);

toolRegistry.register(
  ToolName.SEARCH_TRADERS,
  'Search for traders and their inventories. Returns trader info and available items for purchase.',
  SearchTradersParamsSchema,
  searchTraders
);

toolRegistry.register(
  ToolName.GET_EVENTS,
  'Get current and upcoming game events. Returns event schedules, rewards, and timers.',
  GetEventsParamsSchema,
  getEvents
);
