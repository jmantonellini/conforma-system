import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from 'pg';

test(
	'inserts feedback in the configured test database',
	{ skip: !process.env.TEST_DATABASE_URL },
	async () => {
		const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
		await client.connect();

		try {
			await client.query('BEGIN');
			const result = await client.query(
				'INSERT INTO feedback (mensaje) VALUES ($1) RETURNING id, mensaje, created_at',
				['automated feedback database test']
			);

			assert.equal(result.rowCount, 1);
			assert.equal(result.rows[0].mensaje, 'automated feedback database test');
			assert.ok(result.rows[0].created_at);
		} finally {
			await client.query('ROLLBACK');
			await client.end();
		}
	}
);
