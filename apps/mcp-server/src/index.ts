import { Config, Logger } from '@skippy/shared';
import { startServer } from './server';
import type { ServerContext } from './server';

// Re-export for use by CLI
export { startServer, createServer } from './server';
export type { ServerContext } from './server';
export { toolRegistry } from './tools/registry';

// Only run server when executed directly
if (import.meta.main) {
  const config = new Config(process.env);
  const logger = new Logger(config);

  const context: ServerContext = {
    config,
    logger,
    dataDir: config.dataDir,
    searcherCache: new Map(),
    schemaCache: new Map(),
  };

  startServer(context).catch(error => {
    logger.error('Server failed to start', { error: error.message });
    process.exit(1);
  });
}
