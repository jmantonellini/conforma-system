import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const CARPETA = 'src/lib/server/db/migrations';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL es obligatorio para migrar');

const CAMBIOS_PREVIOS_A_LA_BASE = [
	`ALTER TABLE "adjuntos" ADD COLUMN IF NOT EXISTS "categoria" text DEFAULT 'general' NOT NULL`,
	`DO $$ BEGIN
		IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'adjuntos' AND column_name = 'es_plano') THEN
			UPDATE "adjuntos" SET "categoria" = 'plano' WHERE "es_plano";
			ALTER TABLE "adjuntos" DROP COLUMN "es_plano";
		END IF;
	END $$`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "idx_adjuntos_portada_producto" ON "adjuntos" USING btree ("producto_id") WHERE "adjuntos"."categoria" = 'portada'`
];

const CONTROLES: { titulo: string; sql: string }[] = [
	{
		titulo: 'CUIT repetidos en contactos',
		sql: `SELECT cuit AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM contactos WHERE cuit IS NOT NULL GROUP BY cuit HAVING count(*) > 1`
	},
	{
		titulo: 'Emails repetidos en empleados',
		sql: `SELECT email AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM empleados WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1`
	},
	{
		titulo: 'DNI repetidos en empleados',
		sql: `SELECT dni AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM empleados WHERE dni IS NOT NULL GROUP BY dni HAVING count(*) > 1`
	},
	{
		titulo: 'Códigos repetidos en productos',
		sql: `SELECT codigo AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM productos GROUP BY codigo HAVING count(*) > 1`
	},
	{
		titulo: 'Códigos repetidos en insumos',
		sql: `SELECT codigo AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM insumos GROUP BY codigo HAVING count(*) > 1`
	},
	{
		titulo: 'Porcentajes fuera de rango (>= 1000)',
		sql: `SELECT 'pedidos' AS valor, count(*) AS cantidad, '' AS ids FROM pedidos WHERE abs(porcentaje_comision_distribuidor) >= 1000
			UNION ALL SELECT 'contactos', count(*), '' FROM contactos WHERE abs(porcentaje_compensacion) >= 1000
			UNION ALL SELECT 'insumos', count(*), '' FROM insumos WHERE abs(flete_porcentaje) >= 1000
			UNION ALL SELECT 'cotizaciones', count(*), '' FROM cotizaciones WHERE abs(descuento_global_porcentaje) >= 1000`
	},
	{
		titulo: 'Columnas empresa_id heredadas (deberían llamarse contacto_id)',
		sql: `SELECT table_name AS valor, 1 AS cantidad, '' AS ids FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'empresa_id'`
	},
	{
		titulo: 'Último acceso con valores no convertibles',
		sql: `SELECT ultimo_acceso::text AS valor, count(*) AS cantidad, string_agg(id::text, ', ') AS ids FROM usuarios WHERE ultimo_acceso > 32503680000 GROUP BY ultimo_acceso`
	}
];

async function existe(cliente: pg.Client, consulta: string) {
	const { rows } = await cliente.query(consulta);
	return Boolean(rows[0]?.existe);
}

async function main() {
	const migraciones = readMigrationFiles({ migrationsFolder: CARPETA });
	const base = migraciones[0];
	const cliente = new pg.Client({ connectionString: url });
	await cliente.connect();

	try {
		const hayEsquema = await existe(
			cliente,
			`SELECT to_regclass('public.cotizaciones') IS NOT NULL AS existe`
		);
		const hayHistorial = await existe(
			cliente,
			`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS existe`
		);
		const ultima = hayHistorial
			? Number(
					(
						await cliente.query(
							`SELECT max(created_at) AS ultima, count(*) AS total FROM drizzle.__drizzle_migrations`
						)
					).rows[0]?.ultima ?? 0
				)
			: 0;
		const pendientes = migraciones.filter((m) => m.folderMillis > ultima).length;
		console.log(
			`[migrar] Esquema existente: ${hayEsquema ? 'sí' : 'no'} · última migración aplicada: ${ultima || 'ninguna'} · pendientes: ${pendientes}`
		);

		if (hayEsquema && ultima < base.folderMillis) {
			console.log(
				'[migrar] El historial está antes de la migración base: se aplican los cambios previos y se registra la base.'
			);
			await cliente.query('BEGIN');
			for (const sentencia of CAMBIOS_PREVIOS_A_LA_BASE) await cliente.query(sentencia);
			await cliente.query('CREATE SCHEMA IF NOT EXISTS drizzle');
			await cliente.query(
				'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
			);
			await cliente.query(
				'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
				[base.hash, base.folderMillis]
			);
			await cliente.query('COMMIT');
		}

		if (hayEsquema && migraciones[1] && ultima < migraciones[1].folderMillis) {
			let problemas = 0;
			for (const control of CONTROLES) {
				const { rows } = await cliente
					.query(control.sql)
					.catch(() => ({ rows: [] as Record<string, unknown>[] }));
				const conDatos = rows.filter((fila) => Number(fila.cantidad) > 0);
				if (!conDatos.length) continue;
				problemas++;
				console.error(`[migrar] ✗ ${control.titulo}:`);
				for (const fila of conDatos)
					console.error(
						`          ${fila.valor} → ${fila.cantidad}${fila.ids ? ` (ids ${fila.ids})` : ''}`
					);
			}
			if (problemas) {
				console.error('[migrar] Corregí esos datos antes de migrar. No se modificó nada.');
				process.exit(1);
			}
		}
	} catch (error) {
		await cliente.query('ROLLBACK').catch(() => {});
		throw error;
	} finally {
		await cliente.end();
	}

	const pool = new pg.Pool({ connectionString: url });
	try {
		await migrate(drizzle(pool), { migrationsFolder: CARPETA });
		console.log('[migrar] Migraciones aplicadas.');
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	const causa = error?.cause ?? error;
	console.error('[migrar] ✗ Falló la migración. No se aplicó ningún cambio.');
	if (error?.query)
		console.error(`[migrar] Sentencia:\n${String(error.query).trim().slice(0, 2000)}`);
	console.error(`[migrar] Error: ${causa?.message ?? causa}`);
	for (const campo of ['code', 'detail', 'hint', 'table', 'column', 'constraint', 'where']) {
		if (causa?.[campo]) console.error(`[migrar] ${campo}: ${causa[campo]}`);
	}
	process.exit(1);
});
