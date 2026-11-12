import { aliasedTable, and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { estados, unidades_fabricacion } from '$lib/server/db/schema';

export function resumenOrdenes() {
	return db
		.select({
			orden_id: unidades_fabricacion.orden_fabricacion_id,
			total: sql<number>`count(*)::int`.as('total'),
			terminadas: sql<number>`(count(*) filter (where ${estados.es_final}))::int`.as('terminadas'),
			estado_slug: sql<string>`case
				when bool_and(${estados.es_final}) then 'terminado'
				when bool_or(${estados.slug} in ('en_produccion', 'limpieza')) then 'en_produccion'
				when bool_or(${estados.slug} = 'pausado') then 'pausado'
				else (array_agg(${estados.slug} order by ${unidades_fabricacion.id}))[1]
			end`.as('estado_slug')
		})
		.from(unidades_fabricacion)
		.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
		.groupBy(unidades_fabricacion.orden_fabricacion_id)
		.as('resumen_orden');
}

export function estadoDeOrden(resumen: ReturnType<typeof resumenOrdenes>) {
	const estadoOrden = aliasedTable(estados, 'estado_orden');
	return {
		estadoOrden,
		condicion: and(eq(estadoOrden.flujo, 'fabricacion'), eq(estadoOrden.slug, resumen.estado_slug))
	};
}
