import { describe, test, expect } from 'vitest';

describe('Type exports', () => {
  test('module imports without error', async () => {
    await expect(import('../../src/types')).resolves.toBeDefined();
  });

  test('exports expected types', async () => {
    const module = await import('../../src/types');
    expect(Object.keys(module).sort()).toMatchSnapshot();
  });
});
