import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const pool = new Pool({
	host: env.DB_HOST || 'localhost',
	port: parseInt(env.DB_PORT || '5432'),
	user: env.DB_USER || 'postgres',
	password: env.DB_PASSWORD || 'postgres',
	database: env.DB_NAME || 'erp_db'
});

export const db = drizzle(pool, { schema });

/** Transacción de Drizzle (el `tx` de `db.transaction`). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
