import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Endpoint } from '@skippy/shared';

export interface Schema {
  fields: string[];
}

export async function loadSchema(dataDir: string, endpoint: Endpoint): Promise<Schema> {
  const schemaPath = join(dataDir, endpoint, 'schema.json');
  const content = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content) as Schema;
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
