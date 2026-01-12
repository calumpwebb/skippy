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