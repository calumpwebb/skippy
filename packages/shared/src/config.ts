import { z } from 'zod';

/** Schema for environment variable validation. */
export const ConfigSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATA_DIR: z.string().default('./data'),
  EMBEDDING_MODEL_NAME: z.string().default('Xenova/all-MiniLM-L6-v2'),
  EMBEDDING_MODEL_CACHE_DIR: z.string().default('./models'),
});

export type ConfigEnv = z.infer<typeof ConfigSchema>;

/** Centralized configuration with validation. */
export class Config {
  private readonly env: ConfigEnv;

  constructor(processEnv: Record<string, string | undefined>) {
    this.env = ConfigSchema.parse(processEnv);
  }

  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }

  get dataDir(): string {
    return this.env.DATA_DIR;
  }

  get embeddingModelName(): string {
    return this.env.EMBEDDING_MODEL_NAME;
  }

  get embeddingModelCacheDir(): string {
    return this.env.EMBEDDING_MODEL_CACHE_DIR;
  }
}

// Lazy initialization - NOT a singleton at module load
let _config: Config | undefined;

/** Get or create the global Config instance. */
export function getConfig(): Config {
  if (!_config) {
    _config = new Config(process.env);
  }
  return _config;
}

/** Reset the global Config instance (useful for testing). */
export function resetConfig(): void {
  _config = undefined;
}