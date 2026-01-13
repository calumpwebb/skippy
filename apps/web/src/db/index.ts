import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const DB_PATH = './data/skippy.db';

// Ensure data directory exists
const dataDir = dirname(resolve(DB_PATH));
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// Auto-apply migrations on startup (skip if already applied)
try {
  migrate(db, { migrationsFolder: './drizzle' });
} catch (error) {
  // Ignore "table already exists" errors - migrations already applied
  if (!(error instanceof Error && error.message.includes('already exists'))) {
    throw error;
  }
}

export type Database = typeof db;
