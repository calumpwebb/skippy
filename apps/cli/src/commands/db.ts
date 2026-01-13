import { Command } from 'commander';
import { spawn } from 'bun';
import { resolve, dirname } from 'node:path';
import pc from 'picocolors';

/** Finds the apps/web directory relative to CLI package. */
function getWebAppDir(): string {
  const appsDir = dirname(dirname(dirname(dirname(new URL(import.meta.url).pathname))));
  return resolve(appsDir, 'web');
}

/** Creates the db command with subcommands. */
export function createDbCommand(): Command {
  const command = new Command('db').description('Database management commands');

  command
    .command('migrate')
    .description('Run database migrations')
    .action(async () => {
      const webDir = getWebAppDir();
      console.log(pc.cyan('skippy db migrate') + ' - running migrations...');
      console.log(pc.dim(`Directory: ${webDir}`));
      console.log();

      const subprocess = spawn({
        cmd: ['bun', 'run', 'drizzle-kit', 'push'],
        cwd: webDir,
        stdout: 'inherit',
        stderr: 'inherit',
      });

      const exitCode = await subprocess.exited;
      process.exit(exitCode);
    });

  command
    .command('studio')
    .description('Open Drizzle Studio to browse the database')
    .action(async () => {
      const webDir = getWebAppDir();
      console.log(pc.cyan('skippy db studio') + ' - opening Drizzle Studio...');
      console.log(pc.dim(`Directory: ${webDir}`));
      console.log();

      const subprocess = spawn({
        cmd: ['bun', 'run', 'drizzle-kit', 'studio'],
        cwd: webDir,
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
      });

      const exitCode = await subprocess.exited;
      process.exit(exitCode);
    });

  command
    .command('seed')
    .description('Seed the database with tables and a default user')
    .option('-e, --email <email>', 'User email', 'admin@skippy.local')
    .option('-p, --password <password>', 'User password', 'password')
    .option('-n, --name <name>', 'User name', 'Admin')
    .action(async options => {
      const webDir = getWebAppDir();
      console.log(pc.cyan('skippy db seed') + ' - seeding database...');
      console.log(pc.dim(`Directory: ${webDir}`));
      console.log();

      const subprocess = spawn({
        cmd: ['bun', 'run', 'scripts/seed.ts'],
        cwd: webDir,
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...process.env,
          SEED_EMAIL: options.email,
          SEED_PASSWORD: options.password,
          SEED_NAME: options.name,
        },
      });

      const exitCode = await subprocess.exited;
      process.exit(exitCode);
    });

  return command;
}
