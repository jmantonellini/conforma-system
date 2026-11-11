import { getTableName, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Tx } from '$lib/server/db';

/**
 * Siguiente número correlativo `PREFIJO-00001` para la columna indicada.
 * Toma un advisory lock de la transacción para que dos altas simultáneas no generen el mismo número.
 */
export async function siguienteNumero(tx: Tx, columna: PgColumn, prefijo: string) {
	await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${getTableName(columna.table)}))`);
	const patron = `^${prefijo}-(\\d+)$`;
	const [{ ultimo }] = await tx
		.select({
			ultimo: sql<number>`COALESCE(MAX((substring(${columna} from ${patron}))::int), 0)::int`
		})
		.from(columna.table);
	return `${prefijo}-${String(ultimo + 1).padStart(5, '0')}`;
}
