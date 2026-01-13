#!/usr/bin/env bun
import { Command } from 'commander';
import { createCacheCommand } from './commands/cache';
import { createMcpCommand } from './commands/mcp';
import { createWebCommand } from './commands/web';

// Read version from package.json
const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json();

export const program = new Command()
  .name('skippy')
  .description('Arc Raiders game data tools')
  .version(pkg.version);

export { createCacheCommand, createMcpCommand, createWebCommand };

program.addCommand(createCacheCommand());
program.addCommand(createMcpCommand());
program.addCommand(createWebCommand());

// Only parse if run directly (not imported for testing)
if (import.meta.main) {
  program.parse();
}
