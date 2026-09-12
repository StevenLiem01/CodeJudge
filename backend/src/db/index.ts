import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import 'dotenv/config';

// Mengambil URL koneksi dari file .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Menghubungkan Drizzle ORM dengan PostgreSQL
export const db = drizzle(pool, { schema });