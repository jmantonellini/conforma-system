import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';

export async function GET() {
	const inicio = performance.now();
	const version = env.SENTRY_RELEASE?.slice(0, 7) || 'local';
	try {
		await db.execute(sql`select 1`);
		return json(
			{ estado: 'ok', version, db_ms: Math.round(performance.now() - inicio) },
			{ headers: { 'cache-control': 'no-store' } }
		);
	} catch (error) {
		console.error('[salud] Base de datos no disponible', error);
		return json(
			{ estado: 'error', version, detalle: 'base de datos no disponible' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
}
