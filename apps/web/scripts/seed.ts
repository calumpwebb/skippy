import { Database } from 'bun:sqlite';
import { nanoid } from 'nanoid';
import { mkdirSync, existsSync } from 'node:fs';

const DB_PATH = './data/skippy.db';

/** Hash password using bcrypt (compatible with better-auth). */
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
}

// Ensure data directory exists
if (!existsSync('./data')) {
  mkdirSync('./data', { recursive: true });
}

const db = new Database(DB_PATH);

// Create tables
db.run(`CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL UNIQUE,
  name text,
  email_verified integer,
  image text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at integer,
  refresh_token_expires_at integer,
  scope text,
  id_token text,
  password text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at integer NOT NULL,
  ip_address text,
  user_agent text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS verifications (
  id text PRIMARY KEY NOT NULL,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at integer NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  title text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY NOT NULL,
  conversation_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at integer NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
)`);

console.log('Tables created.');

// Seed default user
async function seedUser(): Promise<void> {
  const email = process.env.SEED_EMAIL ?? 'admin@skippy.local';
  const password = process.env.SEED_PASSWORD ?? 'password';
  const name = process.env.SEED_NAME ?? 'Admin';

  const existing = db.query('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const userId = nanoid();
  const now = Math.floor(Date.now() / 1000);
  const hashedPassword = await hashPassword(password);

  db.run('INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
    userId,
    email,
    name,
    now,
    now,
  ]);

  db.run(
    'INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nanoid(), userId, userId, 'credential', hashedPassword, now, now]
  );

  console.log(`User created: ${email}`);
}

await seedUser();
console.log('Seed complete.');
