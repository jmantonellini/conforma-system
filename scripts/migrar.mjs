import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio para migrar');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
	await migrate(drizzle(pool), { migrationsFolder: 'src/lib/server/db/migrations' });
	console.log('[migrar] Migraciones al día.');
} catch (error) {
	const causa = error?.cause ?? error;
	console.error('[migrar] Falló la migración. No se aplicó ningún cambio.');
	if (error?.query)
		console.error(`[migrar] Sentencia:\n${String(error.query).trim().slice(0, 2000)}`);
	console.error(`[migrar] Error: ${causa?.message ?? causa}`);
	for (const campo of ['code', 'detail', 'hint', 'table', 'column', 'constraint']) {
		if (causa?.[campo]) console.error(`[migrar] ${campo}: ${causa[campo]}`);
	}
	process.exitCode = 1;
} finally {
	await pool.end();
}
