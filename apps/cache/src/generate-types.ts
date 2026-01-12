/** Infers TypeScript type from a JavaScript value. */
export function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const firstElement = value[0];
    // For arrays of objects, return 'object[]' as a placeholder
    // The caller will handle generating proper interfaces
    if (typeof firstElement === 'object' && firstElement !== null) {
      return 'object[]';
    }
    const elementType = inferType(firstElement);
    return `${elementType}[]`;
  }

  const type = typeof value;
  if (type === 'object') return 'object';
  return type;
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

interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
  nestedFields?: Map<string, FieldInfo>;
  arrayElementFields?: Map<string, FieldInfo>;
}

/** Creates FieldInfo for a single key-value pair, looking across all items for arrays. */
function createFieldInfo(key: string, value: unknown, allItems: unknown[]): FieldInfo {
  const info: FieldInfo = {
    name: key,
    type: inferType(value),
    optional: false,
  };

  // Handle nested objects
  const isNestedObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  if (isNestedObject) {
    info.nestedFields = analyzeFields([value], allItems);
  }

  // Handle arrays - look across all items to find non-empty example
  if (Array.isArray(value)) {
    const nonEmptyArray = value.length > 0 ? value : findNonEmptyArray(allItems, key);
    if (nonEmptyArray && nonEmptyArray.length > 0) {
      const firstElement = nonEmptyArray[0];
      if (typeof firstElement === 'object' && firstElement !== null) {
        // Analyze all array elements across all items for better type inference
        const allArrayElements = collectArrayElements(allItems, key);
        info.arrayElementFields = analyzeFields(allArrayElements, allItems);
        info.type = 'object[]'; // Will be replaced with interface name later
      } else {
        info.type = `${inferType(firstElement)}[]`;
      }
    }
  }

  return info;
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

/** Analyzes items to determine field types and optionality. */
function analyzeFields(items: unknown[], allItems?: unknown[]): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();
  const itemCount = items.length;
  const contextItems = allItems ?? items;

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (!fields.has(key)) {
        fields.set(key, createFieldInfo(key, value, contextItems));
      }
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

/** Generates TypeScript interfaces from sample data. */
export function generateTypeScript(name: string, items: unknown[]): string {
  if (items.length === 0) return '';

  const fields = analyzeFields(items);
  const nestedInterfaces: string[] = [];

  // Generate nested interfaces (including array element interfaces)
  function processFields(fieldMap: Map<string, FieldInfo>, parentName: string): void {
    for (const [key, info] of fieldMap) {
      // Handle nested objects
      if (info.nestedFields && info.nestedFields.size > 0) {
        const nestedName = `${parentName}${capitalize(key)}`;
        info.type = nestedName;
        processFields(info.nestedFields, nestedName);

        const nestedFields = Array.from(info.nestedFields.entries())
          .map(([k, v]) => `  ${k}${v.optional ? '?' : ''}: ${v.type};`)
          .join('\n');

        nestedInterfaces.push(`export interface ${nestedName} {\n${nestedFields}\n}`);
      }

      // Handle array elements that are objects
      if (info.arrayElementFields && info.arrayElementFields.size > 0) {
        const elementName = `${parentName}${capitalize(key).replace(/s$/, '')}`;
        info.type = `${elementName}[]`;
        processFields(info.arrayElementFields, elementName);

        const elementFields = Array.from(info.arrayElementFields.entries())
          .map(([k, v]) => `  ${k}${v.optional ? '?' : ''}: ${v.type};`)
          .join('\n');

        nestedInterfaces.push(`export interface ${elementName} {\n${elementFields}\n}`);
      }
    }
  }

  processFields(fields, name);

  // Generate main interface
  const mainFields = Array.from(fields.entries())
    .map(([key, info]) => `  ${key}${info.optional ? '?' : ''}: ${info.type};`)
    .join('\n');

  const mainInterface = `export interface ${name} {\n${mainFields}\n}`;

  return [...nestedInterfaces, mainInterface].join('\n\n');
}

function capitalize(str: string): string {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Writes TypeScript types to a file. */
export async function writeTypes(content: string, outputPath: string): Promise<void> {
  const header = '// Auto-generated by @skippy/cache - do not edit manually\n\n';
  await Bun.write(outputPath, header + content);
}
