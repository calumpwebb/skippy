import { Command } from 'commander';
import { getConfig, Logger } from '@skippy/shared';
import { startServer } from '@skippy/mcp-server';
import type { ServerContext } from '@skippy/mcp-server';
import pc from 'picocolors';
import { validateDataDir, formatError } from '../utils/validate';

/** Creates the mcp command. */
export function createMcpCommand(): Command {
  const command = new Command('mcp')
    .description('Start the MCP server for Claude integration')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .action(async options => {
      const config = getConfig();
      const logger = new Logger(config);

      // Validate data directory
      let dataDir: string;
      try {
        dataDir = await validateDataDir(options.dataDir);
      } catch (error) {
        // Log to stderr since stdout is for MCP protocol
        console.error(pc.red('Error:'), formatError(error));
        process.exitCode = 1;
        return;
      }

      const context: ServerContext = {
        config,
        logger,
        dataDir,
        searcherCache: new Map(),
      };

      try {
        await startServer(context);
        // Server runs until terminated
      } catch (error) {
        console.error(pc.red('MCP server failed:'), formatError(error));
        process.exitCode = 1;
      }
    });

  return command;
}
