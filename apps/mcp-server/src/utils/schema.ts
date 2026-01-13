import { Endpoint } from '@skippy/shared';
import {
  ItemSchema,
  ArcSchema,
  QuestSchema,
  TraderSchema,
  EventSchema,
  extractFieldPaths,
} from '@skippy/shared';
import { z } from 'zod';

export interface Schema {
  fields: string[];
}

const ENTITY_SCHEMAS: Record<Endpoint, z.ZodObject<z.ZodRawShape>> = {
  [Endpoint.ITEMS]: ItemSchema,
  [Endpoint.ARCS]: ArcSchema,
  [Endpoint.QUESTS]: QuestSchema,
  [Endpoint.TRADERS]: TraderSchema,
  [Endpoint.EVENTS]: EventSchema,
};

export function loadSchema(_dataDir: string, endpoint: Endpoint): Schema {
  const zodSchema = ENTITY_SCHEMAS[endpoint];
  const fields = extractFieldPaths(zodSchema);
  return { fields };
}

export function validateFields(schema: Schema, requestedFields: string[]): void {
  if (requestedFields.length === 0) {
    return;
  }

  const validFields = new Set(schema.fields);

  for (const field of requestedFields) {
    if (!validFields.has(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
  }
}
