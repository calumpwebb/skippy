import { Command } from 'commander';
import { getConfig, Logger } from '@skippy/shared';
import { runCache } from '@skippy/cache';
import pc from 'picocolors';
import { validateDataDir, formatError } from '../utils/validate';

/** Creates the cache command. */
export function createCacheCommand(): Command {
  const command = new Command('cache')
    .description('Download and process game data from MetaForge API')
    .option('-d, --data-dir <path>', 'Data directory', './data')
    .option('--no-types', 'Skip TypeScript type generation')
    .option('--no-fixtures', 'Skip test fixture generation')
    .option('--dry-run', 'Show what would be done without making changes')
    .action(async options => {
      const config = getConfig();
      const logger = new Logger(config);

      // Validate data directory
      let dataDir: string;
      try {
        dataDir = await validateDataDir(options.dataDir);
      } catch (error) {
        console.error(pc.red('Error:'), formatError(error));
        process.exitCode = 1;
        return;
      }

      console.log(pc.cyan('skippy cache') + ' - updating game data...');
      console.log();

      if (options.dryRun) {
        console.log(pc.yellow('DRY RUN - no changes will be made'));
        console.log();
        console.log('Would download:');
        console.log('  - items');
        console.log('  - arcs');
        console.log('  - quests');
        console.log('  - traders');
        console.log('  - events');
        console.log();
        console.log(`Data directory: ${dataDir}`);
        console.log(`Generate types: ${options.types}`);
        console.log(`Generate fixtures: ${options.fixtures}`);
        return;
      }

      try {
        const results = await runCache(config, logger, {
          dataDir,
          generateTypes: options.types,
          generateFixtures: options.fixtures,
          onProgress: (endpoint, index, total) => {
            console.log(pc.yellow(`[${index + 1}/${total}] ${endpoint}`));
          },
        });

        console.log();
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.log(pc.red(`Cache update completed with ${failures.length} failure(s)`));
          process.exitCode = 1;
        } else {
          console.log(pc.green('Cache update complete!'));
        }
      } catch (error) {
        logger.error('Cache failed', { error: formatError(error) });
        console.error(pc.red('Cache update failed:'), formatError(error));
        process.exitCode = 1;
      }
    });

  return command;
}
