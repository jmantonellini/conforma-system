import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	try {
		for (const seedUrl of [
			new URL('../src/lib/server/db/seed.sql', import.meta.url),
			new URL('../src/lib/server/db/seed-cotizaciones.sql', import.meta.url)
		]) {
			await pool.query(readFileSync(seedUrl, 'utf-8'));
		}
	} finally {
		await pool.end();
	}
}

main().catch((err) => {
	console.error('Error aplicando seed:', err.message);
	process.exit(1);
});
