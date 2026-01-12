import { describe, test, expect, beforeEach } from 'vitest';
import { Config, ConfigSchema, getConfig, resetConfig } from '../src/config';

describe('Config', () => {
  test('uses default values when env is empty (non-production)', () => {
    const config = new Config({});

    expect(config.logLevel).toBe('info');
    expect(config.dataDir).toBe('./data');
    expect(config.embeddingModelName).toBe('Xenova/all-MiniLM-L6-v2');
  });

  test('respects provided environment values', () => {
    const config = new Config({
      LOG_LEVEL: 'debug',
      DATA_DIR: '/custom/data',
      EMBEDDING_MODEL_NAME: 'custom-model',
    });

    expect(config.logLevel).toBe('debug');
    expect(config.dataDir).toBe('/custom/data');
    expect(config.embeddingModelName).toBe('custom-model');
  });

  test('validates log level enum', () => {
    expect(() => new Config({ LOG_LEVEL: 'invalid' })).toThrow();
  });

  test('provides embedding model cache directory', () => {
    const config = new Config({});
    expect(config.embeddingModelCacheDir).toBe('./models');
  });

  test('allows custom embedding cache directory', () => {
    const config = new Config({ EMBEDDING_MODEL_CACHE_DIR: '/tmp/models' });
    expect(config.embeddingModelCacheDir).toBe('/tmp/models');
  });
});

describe('ConfigSchema', () => {
  test('exports schema for validation reuse', () => {
    expect(ConfigSchema).toBeDefined();
    expect(ConfigSchema.parse).toBeInstanceOf(Function);
  });
});

describe('getConfig / resetConfig', () => {
  beforeEach(() => {
    resetConfig();
  });

  test('getConfig returns cached instance', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2);
  });

  test('resetConfig clears cached instance', () => {
    const config1 = getConfig();
    resetConfig();
    const config2 = getConfig();
    expect(config1).not.toBe(config2);
  });
});