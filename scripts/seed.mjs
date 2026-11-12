import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio para sembrar');

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
await cliente.connect();

try {
	await cliente.query('BEGIN');
	await cliente.query(
		readFileSync(new URL('../src/lib/server/db/seed.sql', import.meta.url), 'utf8')
	);
	await cliente.query('COMMIT');
	console.log('[seed] Datos base al día.');
} catch (error) {
	await cliente.query('ROLLBACK');
	console.error('[seed] Falló el seed; no se aplicó ningún cambio:', error?.message ?? error);
	process.exitCode = 1;
} finally {
	await cliente.end();
}
