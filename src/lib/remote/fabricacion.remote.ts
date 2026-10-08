import * as v from 'valibot';
import { form, command, requested } from '$app/server';
import { db } from '$lib/server/db';
import {
	ordenes_fabricacion,
	unidades_fabricacion,
	lineas_pedido,
	pedidos,
	estados_fabricacion,
	transiciones_estado,
	logs_cambios_estado,
	estados_pedido
} from '$lib/server/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { CrearOrdenSchema } from './fabricacion.schema';
import { getPedidos } from './pedidos.remote';
import {
	getOrdenFabricacion,
	getOrdenesFabricacion,
	getHistorialUnidades
} from './fabricacion-consultas.remote';
import { PEDIDO_SLUG } from '$lib/types';

// ============================================================
// FORMS
// ============================================================

export const crearOrdenFabricacion = form(CrearOrdenSchema, async (data) => {
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const cantidadTotal = Number(data.cantidad_total);

	const [orden] = await db
		.insert(ordenes_fabricacion)
		.values({
			nombre_trabajo: data.nombre_trabajo,
			linea_pedido_id: data.linea_pedido_id,
			cantidad_total: cantidadTotal,
			prioridad: data.prioridad,
			fecha_fin_estimada: data.fecha_fin_estimada ? new Date(data.fecha_fin_estimada) : null,
			asignado_a: data.asignado_a || null,
			observaciones: data.observaciones
		})
		.returning();

	const estadoInicial = await db
		.select()
		.from(estados_fabricacion)
		.where(eq(estados_fabricacion.slug, 'preparando_material'))
		.then((rows) => rows[0]);

	if (!estadoInicial) throw new Error('Estado inicial no configurado');

	const unidades = [];
	for (let i = 1; i <= cantidadTotal; i++) {
		const [unidad] = await db
			.insert(unidades_fabricacion)
			.values({
				orden_fabricacion_id: orden.id,
				numero_serie: `${orden.id}-${i.toString().padStart(3, '0')}`,
				estado_id: estadoInicial.id,
				historial_estados: []
			})
			.returning();
		unidades.push(unidad);
	}

	const pedido = await db
		.select({ id: lineas_pedido.pedido_id, estado_id: pedidos.estado_id })
		.from(lineas_pedido)
		.innerJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.where(eq(lineas_pedido.id, data.linea_pedido_id))
		.then((r) => r[0]);

	if (pedido) {
		const [pendiente, enProd] = await Promise.all([
			db
				.select({ id: estados_pedido.id })
				.from(estados_pedido)
				.where(eq(estados_pedido.slug, 'pendiente'))
				.then((r) => r[0]),
			db
				.select({ id: estados_pedido.id })
				.from(estados_pedido)
				.where(eq(estados_pedido.slug, 'en_produccion'))
				.then((r) => r[0])
		]);

		if (pedido.estado_id === pendiente?.id && enProd) {
			await db.update(pedidos).set({ estado_id: enProd.id }).where(eq(pedidos.id, pedido.id));
		}
	}

	return { success: true, orden, unidades };
});

// ============================================================
// COMMANDS
// ============================================================

export const cambiarEstadoUnidad = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado_destino_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ unidad_id, estado_destino_id, comentario }) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		// 1. Obtener unidad
		const unidad = await db
			.select()
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.id, unidad_id))
			.then((rows) => rows[0]);

		if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

		// 2. Validar transición
		const transicion = await db
			.select()
			.from(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'fabricacion'),
					eq(transiciones_estado.estado_origen_id, unidad.estado_id),
					eq(transiciones_estado.estado_destino_id, estado_destino_id)
				)
			)
			.then((rows) => rows[0]);

		if (!transicion) {
			const [actual, destino] = await Promise.all([
				db
					.select()
					.from(estados_fabricacion)
					.where(eq(estados_fabricacion.id, unidad.estado_id))
					.then((r) => r[0]),
				db
					.select()
					.from(estados_fabricacion)
					.where(eq(estados_fabricacion.id, estado_destino_id))
					.then((r) => r[0])
			]);
			throw new Error(
				`Transición no permitida: ${actual?.nombre ?? '?'} → ${destino?.nombre ?? '?'}`
			);
		}

		// 3. Actualizar unidad
		const historial = unidad.historial_estados ?? [];
		historial.push({
			estado_id: unidad.estado_id,
			fecha: now.toISOString(),
			comentario: comentario ?? undefined
		});

		const estadoDestino = await db
			.select()
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.id, estado_destino_id))
			.then((rows) => rows[0]);

		await db.transaction(async (tx) => {
			await tx
				.update(unidades_fabricacion)
				.set({
					estado_id: estado_destino_id,
					historial_estados: historial,
					comentario_estado: comentario ?? null,
					updated_at: now
				})
				.where(eq(unidades_fabricacion.id, unidad_id));

			await tx.insert(logs_cambios_estado).values({
				entidad_tipo: 'unidad',
				entidad_id: unidad_id,
				usuario_id: user.id,
				estado_anterior_id: unidad.estado_id,
				estado_nuevo_id: estado_destino_id,
				comentario: comentario ?? null,
				created_at: now
			});

			if (estadoDestino?.es_final) {
				const pedido = await tx
					.select({ id: lineas_pedido.pedido_id })
					.from(ordenes_fabricacion)
					.innerJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
					.where(eq(ordenes_fabricacion.id, unidad.orden_fabricacion_id))
					.then((r) => r[0]);

				if (pedido?.id) {
					const res = await tx.execute(sql`
				SELECT 
					COUNT(*)::int as total,
					COUNT(*) FILTER (WHERE ef.es_final = true)::int as terminadas
				FROM unidades_fabricacion uf
				JOIN ordenes_fabricacion of ON uf.orden_fabricacion_id = of.id
				JOIN lineas_pedido lp ON of.linea_pedido_id = lp.id
				JOIN estados_fabricacion ef ON uf.estado_id = ef.id
				WHERE lp.pedido_id = ${pedido.id}
			`);

					const { total, terminadas } = res.rows[0] as { total: number; terminadas: number };

					if (total && total === terminadas) {
						const comp = await tx
							.select({ id: estados_pedido.id })
							.from(estados_pedido)
							.where(eq(estados_pedido.slug, PEDIDO_SLUG.COMPLETADO))
							.then((r) => r[0]);

						if (comp) {
							await tx
								.update(pedidos)
								.set({ estado_id: comp.id, updated_at: now })
								.where(eq(pedidos.id, pedido.id));

							await tx.insert(logs_cambios_estado).values({
								entidad_tipo: 'pedido',
								entidad_id: pedido.id,
								usuario_id: user.id,
								estado_nuevo_id: comp.id,
								comentario: 'Fabricación finalizada',
								created_at: now
							});
						}
					}
				}
			}
		});

		// Refrescar
		Promise.all([
			getPedidos({ search: '', page: 1 }).refresh(),
			getOrdenFabricacion(unidad.orden_fabricacion_id).refresh(),
			getHistorialUnidades(unidad.orden_fabricacion_id).refresh()
		]).catch(() => {});

		return { success: true };
	}
);

export const reanudarUnidad = command(
	v.object({
		unidad_id: v.pipe(v.string(), v.transform(Number), v.number()),
		comentario: v.optional(v.string())
	}),
	async ({ unidad_id, comentario }) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const unidad = await db
			.select()
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.id, unidad_id))
			.then((rows) => rows[0]);

		if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

		const estadoActual = await db
			.select()
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.id, unidad.estado_id))
			.then((rows) => rows[0]);

		if (estadoActual?.slug !== 'pausado') {
			throw new Error('La unidad no está pausada');
		}

		const historial = unidad.historial_estados ?? [];
		if (historial.length === 0) throw new Error('No hay historial');

		// Traer todos los estados del historial de una vez
		const estadosIds = [...new Set(historial.map((h) => h.estado_id))];
		const estadosMap = new Map(
			(
				await db
					.select()
					.from(estados_fabricacion)
					.where(sql`${estados_fabricacion.id} IN ${estadosIds}`)
			).map((e) => [e.id, e])
		);

		const estadoReanudar = historial
			.slice()
			.reverse()
			.find((h) => estadosMap.get(h.estado_id)?.slug !== 'pausado');

		if (!estadoReanudar) {
			throw new Error('No hay estado anterior para reanudar');
		}

		return cambiarEstadoUnidad({
			unidad_id: String(unidad_id),
			estado_destino_id: String(estadoReanudar.estado_id),
			comentario: comentario ?? `Reanudado desde ${estadoActual.nombre}`
		});
	}
);

export const eliminarOrdenFabricacion = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const unidades = await db
			.select({ estado_id: unidades_fabricacion.estado_id })
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.orden_fabricacion_id, id));

		const estadosFinales = await db
			.select({ id: estados_fabricacion.id })
			.from(estados_fabricacion)
			.where(eq(estados_fabricacion.es_final, true))
			.then((rows) => new Set(rows.map((r) => r.id)));

		const algunaFinal = unidades.some((u) => estadosFinales.has(u.estado_id));
		if (algunaFinal) {
			throw new Error('No se puede eliminar una orden con unidades terminadas');
		}

		await db.transaction(async (tx) => {
			await tx
				.delete(unidades_fabricacion)
				.where(eq(unidades_fabricacion.orden_fabricacion_id, id));
			await tx.delete(ordenes_fabricacion).where(eq(ordenes_fabricacion.id, id));
		});

		requested(getOrdenesFabricacion, 1).refreshAll();

		return { success: true };
	}
);
