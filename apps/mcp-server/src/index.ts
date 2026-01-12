import { Config, Logger } from '@skippy/shared';
import { startServer, ServerContext } from './server';

const config = new Config(process.env);
const logger = new Logger(config);

const context: ServerContext = {
  config,
  logger,
  dataDir: config.dataDir,
  searcherCache: new Map(),
};

startServer(context).catch(error => {
  logger.error('Server failed to start', { error: error.message });
  process.exit(1);
});
