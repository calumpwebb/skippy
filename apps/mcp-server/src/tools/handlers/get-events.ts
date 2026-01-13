import { z } from 'zod';
import { join } from 'node:path';
import type { ServerContext } from '../../server';
import type { Event } from '@skippy/shared';

export const GetEventsParamsSchema = z
  .object({})
  .passthrough()
  .transform(() => ({}));

export type GetEventsParams = z.infer<typeof GetEventsParamsSchema>;

export interface GetEventsResult {
  events: Event[];
  cachedAt: string;
}

/** Returns current game events. */
export async function getEvents(
  _params: unknown,
  context: ServerContext
): Promise<GetEventsResult> {
  const dataPath = join(context.dataDir, 'events', 'data.json');
  const file = Bun.file(dataPath);

  if (!(await file.exists())) {
    throw new Error('Events data not found. Run: skippy cache');
  }

  const events = (await file.json()) as Event[];
  const stat = await file.stat();

  return {
    events,
    cachedAt: new Date(stat.mtime).toISOString(),
  };
}
