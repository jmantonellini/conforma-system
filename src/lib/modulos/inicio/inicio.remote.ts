import { error } from '@sveltejs/kit';
import { and, count, eq, gte, isNull, lt, type SQL } from 'drizzle-orm';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { cotizaciones, estados, pedidos, unidades_fabricacion } from '$lib/server/db/schema';
import { tienePermiso, usuarioDeSesion } from '$lib/server/auth/permissions';

type Entidad = typeof cotizaciones | typeof pedidos | typeof unidades_fabricacion;

async function contarAbiertos(tabla: Entidad, filtro?: SQL) {
	const [{ total }] = await db
		.select({ total: count() })
		.from(tabla)
		.innerJoin(estados, eq(estados.id, tabla.estado_id))
		.where(and(eq(estados.es_final, false), filtro));
	return total;
}

export const getResumenInicio = query(async () => {
	const usuario = await usuarioDeSesion();
	if (!usuario) error(401, 'Sesión vencida');

	const [verCotizaciones, verPedidos, verFabricacion] = await Promise.all(
		['cotizaciones', 'pedidos', 'fabricacion'].map((modulo) => tienePermiso(usuario, modulo))
	);
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const enUnaSemana = new Date(hoy.getTime() + 7 * 86_400_000);
	const sinEntregar = isNull(pedidos.fecha_entrega_real);

	const [cotizacionesAbiertas, pedidosEnCurso, entregasVencidas, entregasSemana, enProduccion] =
		await Promise.all([
			verCotizaciones ? contarAbiertos(cotizaciones) : null,
			verPedidos ? contarAbiertos(pedidos) : null,
			verPedidos
				? contarAbiertos(pedidos, and(sinEntregar, lt(pedidos.fecha_entrega_prometida, hoy)))
				: null,
			verPedidos
				? contarAbiertos(
						pedidos,
						and(
							sinEntregar,
							gte(pedidos.fecha_entrega_prometida, hoy),
							lt(pedidos.fecha_entrega_prometida, enUnaSemana)
						)
					)
				: null,
			verFabricacion ? contarAbiertos(unidades_fabricacion) : null
		]);

	return { cotizacionesAbiertas, pedidosEnCurso, entregasVencidas, entregasSemana, enProduccion };
});
