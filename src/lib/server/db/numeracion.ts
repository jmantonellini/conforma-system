import { getTableName, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Tx } from '$lib/server/db';

export async function siguienteNumero(tx: Tx, columna: PgColumn, prefijo: string) {
	const tabla = getTableName(columna.table);
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${tabla} || ':' || empresa_actual()))`
	);
	const patron = `^${prefijo}-(\\d+)$`;
	const [{ ultimo }] = await tx
		.select({
			ultimo: sql<number>`COALESCE(MAX((substring(${columna} from ${patron}))::int), 0)::int`
		})
		.from(columna.table)
		.where(sql`empresa_id = empresa_actual()`);
	return `${prefijo}-${String(ultimo + 1).padStart(5, '0')}`;
}
