import { describe, test, expect } from 'vitest';
import { createFixture, FIXTURE_SIZE } from '../src/generate-test-fixtures';

describe('FIXTURE_SIZE', () => {
  test('is set to 5 items', () => {
    expect(FIXTURE_SIZE).toBe(5);
  });
});

describe('createFixture', () => {
  test('takes first N items from data', () => {
    const items = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
      { id: '6' },
      { id: '7' },
    ];

    const fixture = createFixture(items, 3);

    expect(fixture).toHaveLength(3);
    expect(fixture[0]).toEqual({ id: '1' });
    expect(fixture[2]).toEqual({ id: '3' });
  });

  test('returns all items if less than requested', () => {
    const items = [{ id: '1' }, { id: '2' }];

    const fixture = createFixture(items, 5);

    expect(fixture).toHaveLength(2);
  });

  test('returns empty array for empty input', () => {
    const fixture = createFixture([], 5);
    expect(fixture).toEqual([]);
  });

  test('defaults to FIXTURE_SIZE items', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));

    const fixture = createFixture(items);

    expect(fixture).toHaveLength(FIXTURE_SIZE);
  });
});
