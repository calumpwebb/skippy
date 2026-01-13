export * from './search';

// Re-export types from schemas for backward compatibility
export type { Item } from '../schemas/items';
export type { Arc } from '../schemas/arcs';
export type { Quest } from '../schemas/quests';
export type { Trader } from '../schemas/traders';
export type { Event } from '../schemas/events';

// Union types
import type { Item } from '../schemas/items';
import type { Arc } from '../schemas/arcs';
import type { Quest } from '../schemas/quests';
import type { Trader } from '../schemas/traders';
import type { Event } from '../schemas/events';

/** Union of all searchable entity types (used by HybridSearcher). */
export type SearchableEntity = Item | Arc | Quest | Trader;

/** Union of all game data entity types. */
export type GameEntity = Item | Arc | Quest | Trader | Event;
