export * from './search';
export * from './items';
export * from './arcs';
export * from './quests';
export * from './traders';
export * from './events';

import type { Item } from './items';
import type { Arc } from './arcs';
import type { Quest } from './quests';
import type { Trader } from './traders';
import type { Event } from './events';

/** Union of all searchable entity types (used by HybridSearcher). */
export type SearchableEntity = Item | Arc | Quest | Trader;

/** Union of all game data entity types. */
export type GameEntity = Item | Arc | Quest | Trader | Event;
