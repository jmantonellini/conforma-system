import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

const pool = new pg.Pool({
	host: env.DB_HOST || 'localhost',
	port: parseInt(env.DB_PORT || '5432'),
	user: env.DB_USER || 'postgres',
	password: env.DB_PASSWORD || 'postgres',
	database: env.DB_NAME || 'erp_db'
});

export const db = drizzle(pool, { schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function secuencial<T extends unknown[]>(
	...pasos: { [K in keyof T]: () => PromiseLike<T[K]> }
): Promise<T> {
	const resultados: unknown[] = [];
	for (const paso of pasos) resultados.push(await paso());
	return resultados as T;
}
