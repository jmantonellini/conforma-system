import { spawnSync } from 'node:child_process';

export default async function globalSetup() {
	const connectionString = process.env.TEST_DATABASE_URL;
	if (!connectionString) return;

	const databaseUrl = new URL(connectionString);
	const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
	if (!databaseName.toLowerCase().includes('test')) {
		throw new Error('TEST_DATABASE_URL must point to a database with "test" in its name.');
	}
	if (databaseUrl.hostname !== 'localhost' && databaseUrl.hostname !== '127.0.0.1') {
		throw new Error('E2E tests may only connect to a loopback test database.');
	}

	const migration = spawnSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: connectionString }
	});
	if (migration.status !== 0) throw new Error('Could not migrate the E2E test database.');

	const { Client } = await import('pg');
	const bcrypt = await import('bcryptjs');
	const client = new Client({ connectionString });
	await client.connect();

	try {
		const { rows } = await client.query<{ id: number }>(
			`INSERT INTO roles (nombre)
			 VALUES ('admin')
			 ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
			 RETURNING id`
		);
		const adminRoleId = rows[0].id;
		const passwordHash = await bcrypt.hash('e2e-test-password', 4);

		const { rows: users } = await client.query<{ id: number }>(
			`INSERT INTO usuarios (username, password_hash, rol_id, activo)
			 VALUES ('e2e-admin', $1, $2, true)
			 ON CONFLICT (username) DO UPDATE
			 SET password_hash = EXCLUDED.password_hash, rol_id = EXCLUDED.rol_id, activo = true
			 RETURNING id`,
			[passwordHash, adminRoleId]
		);
		await client.query(
			`INSERT INTO estados_cotizacion (nombre, slug, grupo, orden)
			 VALUES ('Ingresada E2E', 'ingresada', 'ingresada', 0)
			 ON CONFLICT (slug) DO NOTHING`
		);
		await client.query(
			"DELETE FROM sesiones WHERE user_id = (SELECT id FROM usuarios WHERE username = 'e2e-admin')"
		);
		await client.query(
			`INSERT INTO sesiones (id, user_id, expires_at)
			 VALUES ('e2e-test-session', $1, NOW() + INTERVAL '1 day')
			 ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`,
			[users[0].id]
		);
		await client.query("DELETE FROM cotizaciones WHERE cliente_nombre LIKE 'E2E %'");
		await client.query("DELETE FROM contactos WHERE razon_social LIKE 'E2E %'");
	} finally {
		await client.end();
	}
}
