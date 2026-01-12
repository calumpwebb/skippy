import { z } from 'zod';

/** Base parameters shared by all search tools. */
export const BaseSearchParamsSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long (max 500 chars)')
    .describe('Natural language search query'),

  fields: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .describe('Specific fields to return. Be token efficient - only request what you need.'),

  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of results (default: 5, max: 20)'),
});

export type BaseSearchParams = z.infer<typeof BaseSearchParamsSchema>;

/** Creates a result schema for search tools. */
export function BaseSearchResultSchema<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  results: z.ZodArray<T>;
  totalMatches: z.ZodNumber;
  query: z.ZodString;
}> {
  return z.object({
    results: z.array(itemSchema),
    totalMatches: z.number(),
    query: z.string(),
  });
}

export type BaseSearchResult<T> = {
  results: T[];
  totalMatches: number;
  query: string;
};
