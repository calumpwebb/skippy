import { Command } from 'commander';
import { spawn, type Subprocess } from 'bun';
import { resolve, dirname } from 'node:path';
import pc from 'picocolors';

/** Finds the apps/web directory relative to CLI package. */
function getWebAppDir(): string {
  // This file is at apps/cli/src/commands/web.ts
  // Go up 4 levels to apps/, then into web/
  const appsDir = dirname(dirname(dirname(dirname(new URL(import.meta.url).pathname))));
  return resolve(appsDir, 'web');
}

/** Creates the web command. */
export function createWebCommand(): Command {
  const command = new Command('web')
    .description('Start the Skippy web server')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--production', 'Run in production mode (next start)')
    .action(async options => {
      const webDir = getWebAppDir();
      const isProduction = options.production === true;
      const port = options.port;

      const nextCommand = isProduction ? 'start' : 'dev';
      const mode = isProduction ? 'production' : 'development';

      console.log(pc.cyan('skippy web') + ` - starting ${mode} server...`);
      console.log(pc.dim(`Directory: ${webDir}`));
      console.log(pc.dim(`Port: ${port}`));
      console.log();

      let subprocess: Subprocess | null = null;

      const cleanup = (): void => {
        if (subprocess) {
          subprocess.kill();
          subprocess = null;
        }
      };

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(pc.yellow('\nShutting down web server...'));
        cleanup();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
      });

      try {
        subprocess = spawn({
          cmd: ['bun', 'run', 'next', nextCommand, '--port', port],
          cwd: webDir,
          stdout: 'inherit',
          stderr: 'inherit',
          stdin: 'inherit',
        });

        // Wait for the process to exit
        const exitCode = await subprocess.exited;
        process.exit(exitCode);
      } catch (error) {
        console.error(
          pc.red('Failed to start web server:'),
          error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
      }
    });

  return command;
}
