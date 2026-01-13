import { z } from 'zod';

/**
 * Unwraps Zod wrapper types (optional, nullable, default) to get inner type.
 */
function unwrapZodType(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZodType(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZodType(schema._def.innerType);
  }
  return schema;
}

/**
 * Extracts all field paths from a Zod object schema.
 * Returns paths like ['id', 'name', 'stat_block', 'stat_block.damage'].
 */
export function extractFieldPaths(schema: z.ZodObject<z.ZodRawShape>, prefix = ''): string[] {
  const paths: string[] = [];
  const shape = schema.shape;

  for (const [key, value] of Object.entries(shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);

    const unwrapped = unwrapZodType(value as z.ZodTypeAny);

    if (unwrapped instanceof z.ZodObject) {
      paths.push(...extractFieldPaths(unwrapped, path));
    } else if (unwrapped instanceof z.ZodArray) {
      const elementType = unwrapZodType(unwrapped.element);
      if (elementType instanceof z.ZodObject) {
        paths.push(...extractFieldPaths(elementType, path));
      }
    }
  }

  return paths;
}
