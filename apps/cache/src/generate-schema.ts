export interface Schema {
  fields: string[];
}

const MAX_DEPTH = 10;

/** Recursively extracts all field paths from an object. */
export function extractFieldPaths(obj: unknown, prefix: string = '', depth: number = 0): string[] {
  if (depth > MAX_DEPTH) return [];
  if (obj === null || typeof obj !== 'object') {
    return [];
  }

  if (Array.isArray(obj)) {
    // For arrays, extract paths from first non-null element
    const firstItem = obj.find(item => item !== null && item !== undefined);
    if (firstItem && typeof firstItem === 'object') {
      return extractFieldPaths(firstItem, prefix, depth + 1);
    }
    return [];
  }

  const paths: string[] = [];
  const record = obj as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);

    const value = record[key];
    if (value !== null && typeof value === 'object') {
      paths.push(...extractFieldPaths(value, fullPath, depth + 1));
    }
  }

  return paths;
}

/** Generates a schema from an array of objects. */
export function generateSchema(items: unknown[]): Schema {
  const allPaths = new Set<string>();

  for (const item of items) {
    const paths = extractFieldPaths(item);
    for (const path of paths) {
      allPaths.add(path);
    }
  }

  const fields = Array.from(allPaths).sort();

  return { fields };
}

/** Writes schema to a JSON file. */
export async function writeSchema(schema: Schema, outputPath: string): Promise<void> {
  const content = JSON.stringify(schema, null, 2);
  await Bun.write(outputPath, content);
}
