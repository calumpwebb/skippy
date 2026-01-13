import { rename } from 'node:fs/promises';

/** Writes content to a file atomically using rename. */
export async function atomicWrite(path: string, content: string | Uint8Array): Promise<void> {
  const tempPath = `${path}.tmp.${Date.now()}`;
  await Bun.write(tempPath, content);
  await rename(tempPath, path);
}

/** Ensures string ends with exactly one newline. */
export function ensureTrailingNewline(content: string): string {
  return content.replace(/\n*$/, '\n');
}
