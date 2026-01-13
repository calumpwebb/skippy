/** Marker for object types requiring nested schema extraction. */
export const OBJECT_MARKER = '__object__' as const;

/** Marker for object array types requiring nested schema extraction. */
export const OBJECT_ARRAY_MARKER = '__object_array__' as const;

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
