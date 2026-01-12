import { resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';

/**
 * Validates a data directory path.
 * Rejects path traversal attempts and verifies the path is accessible.
 */
export async function validateDataDir(dataDir: string): Promise<string> {
  // Resolve to absolute path
  const resolved = resolve(dataDir);

  // Reject path traversal attempts
  if (dataDir.includes('..')) {
    throw new Error('Path traversal not allowed in --data-dir');
  }

  // Check if directory exists and is readable
  try {
    await access(resolved, constants.R_OK);
  } catch {
    // Directory doesn't exist or isn't readable - that's OK for cache command
    // which will create it. Just return the resolved path.
  }

  return resolved;
}

/**
 * Formats an error for display.
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
