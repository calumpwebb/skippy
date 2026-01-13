import { describe, test, expect, beforeAll } from 'vitest';
import { searchArcs } from '../../src/tools/handlers/search-arcs';
import { Config, Logger, Arc } from '@skippy/shared';
import type { ServerContext } from '../../src/server';
import { validateFields, Schema } from '../../src/utils/schema';

describe('searchArcs', () => {
  let context: ServerContext;

  beforeAll(() => {
    const config = new Config({});
    const logger = new Logger(config);
    context = {
      config,
      logger,
      dataDir: './data',
      searcherCache: new Map(),
      schemaCache: new Map(),
    };
  });

  test('returns typed Arc results', async () => {
    const result = await searchArcs({ query: 'fireball', limit: 5 }, context);

    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);

    if (result.results.length > 0) {
      const arc = result.results[0] as Partial<Arc>;
      // Type assertion - these should be valid Arc fields
      expect(typeof arc.name === 'string' || arc.name === undefined).toBe(true);
    }
  });

  test('extractFields returns Partial<Arc>', async () => {
    const result = await searchArcs(
      { query: 'test', fields: ['name', 'threat_level'], limit: 1 },
      context
    );

    if (result.results.length > 0) {
      const arc = result.results[0];
      // Should only have requested fields
      if (arc) {
        const keys = Object.keys(arc);
        expect(keys.every(k => ['name', 'threat_level'].includes(k))).toBe(true);
      }
    }
  });
});

describe('field validation', () => {
  const mockSchema: Schema = {
    fields: ['id', 'name', 'description', 'threat_level', 'abilities', 'abilities.fire'],
  };

  test('validateFields accepts valid fields', () => {
    expect(() => validateFields(mockSchema, ['name', 'threat_level'])).not.toThrow();
  });

  test('validateFields accepts nested field paths', () => {
    expect(() => validateFields(mockSchema, ['abilities.fire'])).not.toThrow();
  });

  test('validateFields rejects invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['invalid_arc_field'])).toThrow(
      'Invalid field: invalid_arc_field'
    );
  });

  test('validateFields rejects partially invalid field paths', () => {
    expect(() => validateFields(mockSchema, ['name', 'invalid'])).toThrow('Invalid field: invalid');
  });
});
