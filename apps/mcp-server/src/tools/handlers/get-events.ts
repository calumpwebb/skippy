import { z } from 'zod';
import type { ServerContext } from '../../server';
import type { Event } from '@skippy/shared';

export const GetEventsParamsSchema = z
  .object({})
  .passthrough()
  .transform(() => ({}));

export type GetEventsParams = z.infer<typeof GetEventsParamsSchema>;

export interface GetEventsResult {
  events: Event[];
  count: number;
}

/** Returns current game events. */
export async function getEvents(
  _params: unknown,
  context: ServerContext
): Promise<GetEventsResult> {
  return {
    events: context.events,
    count: context.events.length,
  };
}
