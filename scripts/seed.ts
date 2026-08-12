import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	const sql = readFileSync(new URL('../seed.sql', import.meta.url), 'utf-8');
	await pool.query(sql);
	await pool.end();
}

main().catch((err) => {
	console.error('Error aplicando seed:', err.message);
	process.exit(1);
});
