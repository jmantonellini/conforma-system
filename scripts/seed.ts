import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to run seeds');

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		for (const seedUrl of [
			new URL('../src/lib/server/db/seed.sql', import.meta.url),
			new URL('../src/lib/server/db/seed-cotizaciones.sql', import.meta.url)
		]) {
			await client.query(readFileSync(seedUrl, 'utf-8'));
		}
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((error) => {
	console.error(
		'Seed fallido; cambios revertidos:',
		error instanceof Error ? error.message : error
	);
	process.exit(1);
});
