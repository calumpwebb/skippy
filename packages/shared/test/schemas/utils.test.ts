import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import { extractFieldPaths } from '../../src/schemas/utils';

describe('extractFieldPaths', () => {
  test('extracts top-level field names', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      value: z.number(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'name', 'value']);
  });

  test('extracts nested object field paths', () => {
    const schema = z.object({
      id: z.string(),
      stat_block: z.object({
        damage: z.number(),
        health: z.number(),
      }),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('id');
    expect(paths).toContain('stat_block');
    expect(paths).toContain('stat_block.damage');
    expect(paths).toContain('stat_block.health');
  });

  test('handles optional fields', () => {
    const schema = z.object({
      id: z.string(),
      description: z.string().optional(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'description']);
  });

  test('handles nullable fields', () => {
    const schema = z.object({
      id: z.string(),
      description: z.string().nullable(),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['id', 'description']);
  });

  test('extracts array element object fields', () => {
    const schema = z.object({
      id: z.string(),
      locations: z.array(
        z.object({
          map: z.string(),
          x: z.number(),
        })
      ),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('locations');
    expect(paths).toContain('locations.map');
    expect(paths).toContain('locations.x');
  });

  test('handles deeply nested structures', () => {
    const schema = z.object({
      rewards: z.array(
        z.object({
          item: z.object({
            name: z.string(),
            rarity: z.string(),
          }),
        })
      ),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toContain('rewards');
    expect(paths).toContain('rewards.item');
    expect(paths).toContain('rewards.item.name');
    expect(paths).toContain('rewards.item.rarity');
  });

  test('handles primitive arrays without nested paths', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const paths = extractFieldPaths(schema);

    expect(paths).toEqual(['tags']);
  });
});
