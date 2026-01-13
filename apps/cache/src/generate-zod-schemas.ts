/** Marker for object types requiring nested schema extraction. */
export const OBJECT_MARKER = '__object__' as const;

/** Marker for object array types requiring nested schema extraction. */
export const OBJECT_ARRAY_MARKER = '__object_array__' as const;

interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
  nullable: boolean;
  nestedFields?: Map<string, FieldInfo>;
  arrayElementFields?: Map<string, FieldInfo>;
}

/** Infers Zod type string from a JavaScript value. */
export function inferZodType(value: unknown): string {
  if (value === null) return 'z.null()';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'z.array(z.unknown())';
    const firstElement = value[0];
    if (typeof firstElement === 'object' && firstElement !== null) {
      return OBJECT_ARRAY_MARKER;
    }
    const elementType = inferZodType(firstElement);
    return `z.array(${elementType})`;
  }

  const type = typeof value;
  if (type === 'object') return OBJECT_MARKER;
  if (type === 'string') return 'z.string()';
  if (type === 'number') return 'z.number()';
  if (type === 'boolean') return 'z.boolean()';

  return 'z.unknown()';
}

/** Finds the first non-empty array value for a field across all items. */
function findNonEmptyArray(items: unknown[], key: string): unknown[] | null {
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const value = record[key];
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }
  return null;
}

/** Collects all array elements for a given key across all items. */
function collectArrayElements(items: unknown[], key: string): unknown[] {
  const elements: unknown[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const value = record[key];
    if (Array.isArray(value)) {
      elements.push(...value);
    }
  }
  return elements;
}

/** Checks if a field has null values in any item. */
function hasNullValues(items: unknown[], key: string): boolean {
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (key in record && record[key] === null) {
      return true;
    }
  }
  return false;
}

/** Creates FieldInfo for a single key-value pair. */
function createFieldInfo(key: string, value: unknown, allItems: unknown[]): FieldInfo {
  const info: FieldInfo = {
    name: key,
    type: inferZodType(value),
    optional: false,
    nullable: hasNullValues(allItems, key),
  };

  // Handle nested objects (but not null)
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    info.nestedFields = analyzeFields([value], allItems);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const nonEmptyArray = value.length > 0 ? value : findNonEmptyArray(allItems, key);
    if (nonEmptyArray && nonEmptyArray.length > 0) {
      const firstElement = nonEmptyArray[0];
      if (typeof firstElement === 'object' && firstElement !== null) {
        const allArrayElements = collectArrayElements(allItems, key);
        info.arrayElementFields = analyzeFields(allArrayElements, allItems);
        info.type = '__object_array__';
      }
    }
  }

  return info;
}

/** Finds non-null value for a key in items. */
function findNonNullValue(key: string, items: unknown[]): unknown | null {
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (key in record && record[key] !== null) {
      return record[key];
    }
  }
  return null;
}

/** Processes a single field entry and adds to fields map. */
function processFieldEntry(
  key: string,
  value: unknown,
  fields: Map<string, FieldInfo>,
  contextItems: unknown[]
): void {
  if (fields.has(key)) return;

  if (value !== null) {
    fields.set(key, createFieldInfo(key, value, contextItems));
    return;
  }

  // Value is null, try to find non-null value in other items
  const nonNullValue = findNonNullValue(key, contextItems);
  if (nonNullValue !== null) {
    fields.set(key, createFieldInfo(key, nonNullValue, contextItems));
  } else {
    fields.set(key, { name: key, type: 'z.null()', optional: false, nullable: true });
  }
}

/** Analyzes items to determine field types and optionality. */
function analyzeFields(items: unknown[], allItems?: unknown[]): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();
  const itemCount = items.length;
  const contextItems = allItems ?? items;

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      processFieldEntry(key, value, fields, contextItems);
    }
  }

  // Mark fields as optional if not present in all items
  for (const [key, info] of fields) {
    const presentCount = items.filter(
      item => typeof item === 'object' && item !== null && key in item
    ).length;
    info.optional = presentCount < itemCount;
  }

  return fields;
}

function capitalize(str: string): string {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Generates Zod schema code from sample data. */
export function generateZodSchema(name: string, items: unknown[]): string {
  if (items.length === 0) return '';

  const fields = analyzeFields(items);
  const nestedSchemas: string[] = [];
  const nestedTypes: string[] = [];

  /** Process fields and generate nested schemas. */
  function processFields(fieldMap: Map<string, FieldInfo>, parentName: string): void {
    for (const [key, info] of fieldMap) {
      // Handle nested objects
      if (info.nestedFields && info.nestedFields.size > 0) {
        const nestedName = `${parentName}${capitalize(key)}`;
        info.type = nestedName + 'Schema';
        processFields(info.nestedFields, nestedName);

        const nestedFieldStrs = Array.from(info.nestedFields.entries())
          .map(([k, v]) => {
            let typeStr = v.type;
            if (v.nullable && !typeStr.includes('.nullable()')) {
              typeStr = typeStr.replace(/\)$/, '.nullable())');
              if (!typeStr.includes('.nullable()')) {
                typeStr = typeStr + '.nullable()';
              }
            }
            if (v.optional) {
              typeStr = typeStr + '.optional()';
            }
            return `  ${k}: ${typeStr},`;
          })
          .join('\n');

        nestedSchemas.push(
          `export const ${nestedName}Schema = z.object({\n${nestedFieldStrs}\n});`
        );
        nestedTypes.push(`export type ${nestedName} = z.infer<typeof ${nestedName}Schema>;`);
      }

      // Handle array elements that are objects
      if (info.arrayElementFields && info.arrayElementFields.size > 0) {
        // Singularize: locations -> Location, rewards -> Reward
        const singular = capitalize(key).replace(/s$/, '');
        const elementName = `${parentName}${singular}`;
        info.type = `z.array(${elementName}Schema)`;
        processFields(info.arrayElementFields, elementName);

        const elementFieldStrs = Array.from(info.arrayElementFields.entries())
          .map(([k, v]) => {
            let typeStr = v.type;
            if (v.nullable && !typeStr.includes('.nullable()')) {
              typeStr = typeStr + '.nullable()';
            }
            if (v.optional) {
              typeStr = typeStr + '.optional()';
            }
            return `  ${k}: ${typeStr},`;
          })
          .join('\n');

        nestedSchemas.push(
          `export const ${elementName}Schema = z.object({\n${elementFieldStrs}\n});`
        );
        nestedTypes.push(`export type ${elementName} = z.infer<typeof ${elementName}Schema>;`);
      }
    }
  }

  processFields(fields, name);

  // Generate main schema
  const mainFieldStrs = Array.from(fields.entries())
    .map(([key, info]) => {
      let typeStr = info.type;
      if (info.nullable && !typeStr.includes('.nullable()') && !typeStr.includes('Schema')) {
        typeStr = typeStr + '.nullable()';
      }
      if (info.optional) {
        typeStr = typeStr + '.optional()';
      }
      return `  ${key}: ${typeStr},`;
    })
    .join('\n');

  const mainSchema = `export const ${name}Schema = z.object({\n${mainFieldStrs}\n});`;
  const mainType = `export type ${name} = z.infer<typeof ${name}Schema>;`;

  const header =
    "// Auto-generated by @skippy/cache - do not edit manually\n\nimport { z } from 'zod';\n";

  return [header, ...nestedSchemas, mainSchema, '', ...nestedTypes, mainType, ''].join('\n');
}

/** Writes Zod schema to a file. */
export async function writeZodSchema(content: string, outputPath: string): Promise<void> {
  await Bun.write(outputPath, content);
}
