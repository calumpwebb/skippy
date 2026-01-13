const FORBIDDEN_PATHS = ['__proto__', 'constructor', 'prototype'];
const MAX_FIELD_DEPTH = 4;

/** Validates a field path for security. */
export function validateFieldPath(path: string): void {
  const parts = path.split('.');

  if (parts.length > MAX_FIELD_DEPTH) {
    throw new Error(`Field path too deep: ${path}`);
  }

  for (const part of parts) {
    if (FORBIDDEN_PATHS.includes(part.toLowerCase())) {
      throw new Error(`Invalid field path: ${path}`);
    }
  }
}

/** Type guard for indexable objects. */
function isIndexable(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** Gets a nested value from an object using dot notation. */
export function getNestedValue<T extends object>(obj: T, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (!isIndexable(current)) return undefined;
    current = current[key];
  }
  return current;
}

/** Extracts specified fields from an object. */
export function extractFields<T extends object>(entity: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) return entity;

  for (const field of fields) {
    validateFieldPath(field);
  }

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getNestedValue(entity, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result as Partial<T>;
}
