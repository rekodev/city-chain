import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING!
});

export const db = drizzle(pool, { schema });
