import { describe, test, expect } from 'vitest';
import { SearchArcsParamsSchema } from '../../src/tools/handlers/search-arcs';
import { validateFields, Schema } from '../../src/utils/schema';

describe('SearchArcsParamsSchema', () => {
  test('extends BaseSearchParamsSchema with query, fields, limit', () => {
    const valid = SearchArcsParamsSchema.parse({
      query: 'test arc',
      limit: 5,
    });

    expect(valid.query).toBe('test arc');
    expect(valid.limit).toBe(5);
  });

  test('rejects empty query', () => {
    expect(() => SearchArcsParamsSchema.parse({ query: '' })).toThrow();
  });

  test('accepts optional fields array', () => {
    const withFields = SearchArcsParamsSchema.parse({
      query: 'test',
      fields: ['name', 'threat_level'],
    });
    expect(withFields.fields).toEqual(['name', 'threat_level']);
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
