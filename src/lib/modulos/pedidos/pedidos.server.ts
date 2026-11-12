import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { db, type Tx } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	pedido_insumos,
	estados,
	productos,
	insumos,
	ordenes_fabricacion,
	unidades_fabricacion,
	pagos,
	envios,
	transportistas,
	cotizaciones,
	contactos,
	reservas_stock,
	ubicaciones_stock
} from '$lib/server/db/schema';
import {
	aliasedTable,
	and,
	desc,
	eq,
	gte,
	ilike,
	isNull,
	lte,
	notInArray,
	or,
	sql
} from 'drizzle-orm';
import { avisarCambioEstadoPedido } from './avisos.server';
import { PEDIDO_SLUG } from '$lib/modulos/pedidos/tipos';
import {
	estadoPorSlug,
	historialEstados,
	registrarCambioEstado,
	transicionesDesde,
	validarTransicion
} from '$lib/server/estados';
import {
	resolverLineaComercial,
	type LineaComercialEntrada
} from '$lib/modulos/ventas/lineas.server';
import { listarAdjuntosRelacionados } from '$lib/modulos/adjuntos/adjuntos.server';
import { resumenOrdenes } from '$lib/modulos/fabricacion/fabricacion.server';
import {
	procesarReservasPedidoTx,
	reservarStockParaLineaTx
} from '$lib/modulos/stock/stock.server';
import { siguienteNumero } from '$lib/server/db/numeracion';
import {
	formatearDosDecimales,
	normalizarPrecioPendiente,
	redondearPrecio
} from '$lib/utils/precios';

const idOpcional = v.pipe(
	v.optional(v.union([v.string(), v.number()])),
	v.transform((valor) => Number(valor) || undefined)
);
const precio = v.pipe(
	v.optional(v.union([v.string(), v.number(), v.null()])),
	v.transform((valor) => normalizarPrecioPendiente(valor))
);

const pagadoPedido = sql<number>`coalesce(${pedidos.anticipo}, 0) + coalesce((
	select sum(${pagos.monto}) from ${pagos} where ${pagos.pedido_id} = ${pedidos.id}
), 0)`.mapWith(Number);

export const LineaPedidoSchema = v.object({
	tipo: v.optional(v.picklist(['producto', 'insumo', 'concepto']), 'producto'),
	visible_cliente: v.optional(v.boolean(), true),
	producto_id: v.optional(v.pipe(v.union([v.string(), v.number()]), v.transform(String))),
	stock_ubicacion_id: idOpcional,
	insumo_id: idOpcional,
	nuevo_insumo: v.optional(
		v.object({
			nombre: v.pipe(v.string(), v.nonEmpty('El nombre del insumo es requerido')),
			tipo_id: v.pipe(v.number(), v.toMinValue(1)),
			categoria_id: v.optional(v.pipe(v.number(), v.toMinValue(1))),
			unidad_id: v.pipe(v.number(), v.toMinValue(1)),
			unidad: v.pipe(v.string(), v.nonEmpty('La unidad es requerida')),
			costo_unitario: v.pipe(v.number(), v.toMinValue(0))
		})
	),
	cantidad: v.pipe(v.number(), v.toMinValue(1)),
	precio,
	precio_lista: precio,
	costo_materiales: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	descripcion: v.optional(v.string()),
	insumos_asociados: v.optional(
		v.array(
			v.object({
				insumo_id: v.pipe(v.number(), v.toMinValue(1)),
				cantidad: v.pipe(v.number(), v.toMinValue(0.000001))
			})
		),
		[]
	)
});

export const PedidoSchema = v.object({
	contacto_id: v.pipe(v.string(), v.toNumber()),
	contacto_distribuidor_id: idOpcional,
	usar_credito_distribuidor: v.optional(v.boolean(), false),
	monto_credito_distribuidor: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	porcentaje_comision_distribuidor: v.optional(
		v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		0
	),
	lineas: v.pipe(
		v.string(),
		v.parseJson(undefined, 'Agregá al menos un concepto válido'),
		v.array(LineaPedidoSchema),
		v.minLength(1, 'Agregá al menos un concepto válido')
	),
	fecha_entrega_prometida: v.optional(v.string()),
	anticipo: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	observaciones: v.optional(v.string())
});

export type NuevoPedido = v.InferOutput<typeof PedidoSchema>;

async function bloquearPedido(tx: Tx, id: number) {
	const [pedido] = await tx.select().from(pedidos).where(eq(pedidos.id, id)).for('update');
	if (!pedido) error(404, 'Pedido no encontrado');
	return pedido;
}

export async function obtenerPedidoDetalle(id: number) {
	const [pedido] = await db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			contacto_distribuidor_id: pedidos.contacto_distribuidor_id,
			usar_credito_distribuidor: pedidos.usar_credito_distribuidor,
			monto_credito_distribuidor: pedidos.monto_credito_distribuidor,
			porcentaje_comision_distribuidor: pedidos.porcentaje_comision_distribuidor,
			monto_comision_distribuidor: pedidos.monto_comision_distribuidor,
			cliente: {
				id: contactos.id,
				nombre: contactos.nombre,
				apellido: contactos.apellido,
				razon_social: contactos.razon_social
			},
			fecha: pedidos.fecha_pedido,
			observaciones: pedidos.observaciones,
			anticipo: pedidos.anticipo,
			total: pedidos.precio_total,
			estado: { id: pedidos.estado_id, nombre: estados.nombre, color: estados.color }
		})
		.from(pedidos)
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(estados, eq(pedidos.estado_id, estados.id))
		.where(eq(pedidos.id, id))
		.limit(1);
	if (!pedido) error(404, 'Pedido no encontrado');

	const resumen = resumenOrdenes();
	const distribuidor = aliasedTable(contactos, 'distribuidor');
	const [transiciones, filas, insumosAdicionales, [cotizacion]] = await Promise.all([
		transicionesDesde(pedido.estado.id),
		db
			.select({
				id: lineas_pedido.id,
				cantidad: lineas_pedido.cantidad,
				precio_unitario: lineas_pedido.precio_unitario,
				precio_lista_unitario: lineas_pedido.precio_lista_unitario,
				margen_porcentaje: lineas_pedido.margen_porcentaje,
				costo_materiales: lineas_pedido.costo_materiales,
				subtotal: lineas_pedido.subtotal,
				es_personalizado: lineas_pedido.es_personalizado,
				descripcion_personalizada: lineas_pedido.descripcion_personalizada,
				producto_id: lineas_pedido.producto_id,
				producto_codigo: productos.codigo,
				producto_nombre: productos.nombre,
				orden_id: ordenes_fabricacion.id,
				unidades_total: resumen.total,
				unidades_terminadas: resumen.terminadas,
				reserva_stock: {
					cantidad: reservas_stock.cantidad,
					estado: reservas_stock.estado,
					ubicacion_stock_id: reservas_stock.ubicacion_stock_id,
					ubicacion_nombre: sql<string>`COALESCE(${distribuidor.razon_social}, ${ubicaciones_stock.nombre})`
				}
			})
			.from(lineas_pedido)
			.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
			.leftJoin(ordenes_fabricacion, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
			.leftJoin(resumen, eq(resumen.orden_id, ordenes_fabricacion.id))
			.leftJoin(reservas_stock, eq(reservas_stock.linea_pedido_id, lineas_pedido.id))
			.leftJoin(ubicaciones_stock, eq(reservas_stock.ubicacion_stock_id, ubicaciones_stock.id))
			.leftJoin(distribuidor, eq(distribuidor.id, ubicaciones_stock.contacto_distribuidor_id))
			.where(eq(lineas_pedido.pedido_id, id))
			.orderBy(lineas_pedido.orden_linea, lineas_pedido.id),
		db
			.select({
				id: pedido_insumos.id,
				insumo_id: pedido_insumos.insumo_id,
				codigo: insumos.codigo,
				nombre: insumos.nombre,
				cantidad: pedido_insumos.cantidad,
				unidad: pedido_insumos.unidad,
				costo_unitario: pedido_insumos.costo_unitario,
				precio_lista_unitario: pedido_insumos.precio_lista_unitario,
				precio_unitario: pedido_insumos.precio_unitario
			})
			.from(pedido_insumos)
			.innerJoin(insumos, eq(pedido_insumos.insumo_id, insumos.id))
			.where(eq(pedido_insumos.pedido_id, id)),
		db
			.select({ id: cotizaciones.id })
			.from(cotizaciones)
			.where(eq(cotizaciones.pedido_id, id))
			.limit(1)
	]);

	const lineas = filas.map(({ unidades_total, unidades_terminadas, reserva_stock, ...linea }) => ({
		...linea,
		produccion: linea.orden_id
			? {
					orden_id: linea.orden_id,
					terminadas: unidades_terminadas ?? 0,
					total: unidades_total ?? 0,
					es_final: Boolean(unidades_total) && unidades_terminadas === unidades_total
				}
			: null,
		reserva_stock: reserva_stock ? { linea_pedido_id: linea.id, ...reserva_stock } : null
	}));
	const ordenes = lineas.flatMap((linea) => (linea.orden_id ? [linea.orden_id] : []));

	return {
		pedido: {
			...pedido,
			transiciones,
			navegacion: {
				cotizacion_id: cotizacion?.id ?? null,
				orden_fabricacion_id: ordenes.length === 1 ? ordenes[0] : null
			}
		},
		lineas,
		insumosAdicionales,
		adjuntos: await listarAdjuntosRelacionados({
			pedidoId: id,
			cotizacionId: cotizacion?.id,
			ordenIds: ordenes
		})
	};
}

export async function getPedidosListado({
	search,
	estadoId,
	page = 1,
	limit = 10
}: {
	search?: string;
	estadoId?: number;
	page?: number;
	limit?: number;
}) {
	const distribuidor = aliasedTable(contactos, 'distribuidor');
	const where = and(
		search
			? or(
					ilike(pedidos.numero_pedido, `%${search}%`),
					ilike(contactos.razon_social, `%${search}%`)
				)
			: undefined,
		estadoId ? eq(pedidos.estado_id, estadoId) : undefined
	);
	const [data, [{ total }]] = await Promise.all([
		db
			.select({
				id: pedidos.id,
				numero_pedido: pedidos.numero_pedido,
				cliente_nombre: contactos.razon_social,
				distribuidor_nombre: distribuidor.razon_social,
				fecha_pedido: pedidos.fecha_pedido,
				fecha_entrega: pedidos.fecha_entrega_prometida,
				fecha_entrega_real: pedidos.fecha_entrega_real,
				total: pedidos.precio_total,
				pagado: pagadoPedido,
				articulos: sql<number>`(
					select coalesce(sum(${lineas_pedido.cantidad}), 0) from ${lineas_pedido}
					where ${lineas_pedido.pedido_id} = ${pedidos.id}
				)`.mapWith(Number),
				primer_articulo: sql<string | null>`(
					select coalesce(${productos.nombre}, ${lineas_pedido.descripcion_personalizada})
					from ${lineas_pedido} left join ${productos} on ${productos.id} = ${lineas_pedido.producto_id}
					where ${lineas_pedido.pedido_id} = ${pedidos.id}
					order by ${lineas_pedido.orden_linea} nulls last, ${lineas_pedido.id} limit 1
				)`,
				unidades: sql<{ total: number; terminadas: number }>`(
					select json_build_object(
						'total', count(*)::int,
						'terminadas', (count(*) filter (where ${estados.es_final}))::int
					)
					from ${unidades_fabricacion}
					join ${ordenes_fabricacion} on ${ordenes_fabricacion.id} = ${unidades_fabricacion.orden_fabricacion_id}
					join ${lineas_pedido} on ${lineas_pedido.id} = ${ordenes_fabricacion.linea_pedido_id}
					join ${estados} on ${estados.id} = ${unidades_fabricacion.estado_id}
					where ${lineas_pedido.pedido_id} = ${pedidos.id}
				)`,
				estado_id: pedidos.estado_id,
				estado_slug: estados.slug,
				estado_nombre: estados.nombre,
				estado_color: estados.color,
				estado_final: estados.es_final
			})
			.from(pedidos)
			.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
			.leftJoin(distribuidor, eq(pedidos.contacto_distribuidor_id, distribuidor.id))
			.leftJoin(estados, eq(pedidos.estado_id, estados.id))
			.where(where)
			.orderBy(desc(pedidos.id))
			.limit(limit)
			.offset((page - 1) * limit),
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(pedidos)
			.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
			.where(where)
	]);

	return { data, total, totalPages: Math.ceil(total / limit), currentPage: page };
}

type EventoHistorial = {
	id: string;
	tipo: 'estado' | 'pago' | 'envio' | 'entrega';
	titulo: string;
	fecha: Date | null;
	detalle: string | null;
	empleado: string | null;
	estado_anterior: { nombre: string | null; color: string | null } | null;
	estado_nuevo: { nombre: string | null; color: string | null } | null;
};

const evento = (
	datos: Pick<EventoHistorial, 'id' | 'tipo' | 'titulo' | 'fecha' | 'detalle'> &
		Partial<EventoHistorial>
): EventoHistorial => ({ empleado: null, estado_anterior: null, estado_nuevo: null, ...datos });

const unir = (...partes: (string | null | undefined | false)[]) =>
	partes.filter(Boolean).join(' · ');

export async function getHistorialPedidoServicio(pedidoId: number) {
	const [cambiosEstado, pagosPedido, enviosPedido, [pedido]] = await Promise.all([
		historialEstados('pedido', [pedidoId]),
		db.select().from(pagos).where(eq(pagos.pedido_id, pedidoId)),
		db
			.select({
				id: envios.id,
				numero_guia: envios.numero_guia,
				cantidad_bultos: envios.cantidad_bultos,
				estado: envios.estado,
				fecha_entrega: envios.fecha_entrega,
				observaciones: envios.observaciones,
				created_at: envios.created_at,
				transportista: transportistas.nombre
			})
			.from(envios)
			.innerJoin(transportistas, eq(envios.transportista_id, transportistas.id))
			.where(eq(envios.pedido_id, pedidoId)),
		db
			.select({ anticipo: pedidos.anticipo, created_at: pedidos.created_at })
			.from(pedidos)
			.where(eq(pedidos.id, pedidoId))
	]);

	const eventos: EventoHistorial[] = [
		...cambiosEstado.map((cambio) =>
			evento({
				...cambio,
				id: `estado-${cambio.id}`,
				tipo: 'estado',
				titulo: 'Cambio de estado',
				detalle: cambio.comentario
			})
		),
		...(pedido?.anticipo
			? [
					evento({
						id: `anticipo-${pedidoId}`,
						tipo: 'pago',
						titulo: 'Anticipo inicial',
						fecha: pedido.created_at,
						detalle: `$${formatearDosDecimales(pedido.anticipo)}`
					})
				]
			: []),
		...pagosPedido.map((pago) =>
			evento({
				id: `pago-${pago.id}`,
				tipo: 'pago',
				titulo: 'Pago registrado',
				fecha: pago.fecha_pago ?? pago.created_at,
				detalle: unir(`$${formatearDosDecimales(pago.monto)}`, pago.metodo_pago, pago.observaciones)
			})
		),
		...enviosPedido.flatMap((envio) => {
			const guia = envio.numero_guia && `Guía ${envio.numero_guia}`;
			const registrado = evento({
				id: `envio-${envio.id}`,
				tipo: 'envio',
				titulo: 'Envío registrado',
				fecha: envio.created_at,
				detalle: unir(
					envio.transportista,
					guia,
					`${envio.cantidad_bultos ?? 1} bultos`,
					envio.observaciones
				)
			});
			return envio.estado === 'entregado' && envio.fecha_entrega
				? [
						registrado,
						evento({
							id: `entrega-${envio.id}`,
							tipo: 'entrega',
							titulo: 'Envío entregado',
							fecha: envio.fecha_entrega,
							detalle: guia || envio.transportista
						})
					]
				: [registrado];
		})
	];

	return eventos.sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));
}

export async function crearPedidoServicio(data: NuevoPedido, usuarioId: number) {
	const estadoInicial = await estadoPorSlug('pedido', PEDIDO_SLUG.PENDIENTE);

	return db.transaction(async (tx) => {
		const lineas = [];
		for (const [orden_linea, linea] of data.lineas.entries()) {
			const resuelta = await resolverLineaComercial(
				tx,
				{
					...(linea as LineaComercialEntrada),
					precio_unitario: linea.precio_lista ?? linea.precio,
					precio_lista_unitario: linea.precio_lista ?? linea.precio
				},
				'PED'
			);
			lineas.push({ ...resuelta, orden_linea, stock_ubicacion_id: linea.stock_ubicacion_id });
		}

		const distribuidorId = data.contacto_distribuidor_id ?? null;
		const precioTotal = redondearPrecio(
			lineas
				.filter((linea) => linea.visible_cliente)
				.reduce((suma, linea) => suma + linea.cantidad * linea.precio_unitario, 0)
		);
		const usaCredito = Boolean(distribuidorId && data.usar_credito_distribuidor);
		const credito = usaCredito ? Math.min(data.monto_credito_distribuidor, precioTotal) : 0;
		const anticipo = data.anticipo ?? 0;

		const numeroPedido = await siguienteNumero(tx, pedidos.numero_pedido, 'P');
		const [pedido] = await tx
			.insert(pedidos)
			.values({
				numero_pedido: numeroPedido,
				creado_por: usuarioId,
				contacto_id: data.contacto_id,
				contacto_distribuidor_id: distribuidorId,
				usar_credito_distribuidor: usaCredito,
				monto_credito_distribuidor: credito,
				porcentaje_comision_distribuidor: data.porcentaje_comision_distribuidor,
				monto_comision_distribuidor: redondearPrecio(
					precioTotal * (data.porcentaje_comision_distribuidor / 100)
				),
				fecha_pedido: new Date(),
				fecha_entrega_prometida: data.fecha_entrega_prometida
					? new Date(data.fecha_entrega_prometida)
					: null,
				estado_id: estadoInicial.id,
				precio_total: precioTotal,
				anticipo,
				observaciones: data.observaciones
			})
			.returning();

		const deInsumos = lineas.filter((linea) => linea.tipo === 'insumo');
		const deProductos = lineas.filter((linea) => linea.tipo !== 'insumo');
		if (deInsumos.length) {
			await tx.insert(pedido_insumos).values(
				deInsumos.map((linea) => ({
					pedido_id: pedido.id,
					insumo_id: linea.insumo_id!,
					cantidad: linea.cantidad,
					unidad: linea.insumos_snapshot[0]?.unidad ?? 'unidad',
					costo_unitario: linea.costo_materiales,
					precio_lista_unitario: linea.precio_lista_unitario,
					precio_unitario: linea.visible_cliente ? linea.precio_unitario : 0,
					observaciones: `Insumo incluido en el pedido ${numeroPedido}`
				}))
			);
		}
		const insertadas = deProductos.length
			? await tx
					.insert(lineas_pedido)
					.values(
						deProductos.map((linea) => ({
							pedido_id: pedido.id,
							producto_id: linea.producto_id,
							cantidad: linea.cantidad,
							precio_unitario: linea.visible_cliente ? linea.precio_unitario : 0,
							precio_lista_unitario: linea.precio_lista_unitario,
							margen_porcentaje: linea.margen_producto,
							costo_materiales: linea.costo_materiales,
							insumos_snapshot: linea.insumos_snapshot,
							es_personalizado: linea.es_personalizado,
							descripcion_personalizada: linea.es_personalizado ? linea.descripcion : null,
							orden_linea: linea.orden_linea
						}))
					)
					.returning({ id: lineas_pedido.id, orden_linea: lineas_pedido.orden_linea })
			: [];

		const idPorOrden = new Map(insertadas.map((fila) => [fila.orden_linea, fila.id]));
		for (const linea of deProductos.filter((linea) => linea.stock_ubicacion_id)) {
			if (!linea.producto_id) error(400, 'Solo se puede reservar stock para productos');
			await reservarStockParaLineaTx(tx, {
				lineaPedidoId: idPorOrden.get(linea.orden_linea)!,
				productoId: linea.producto_id,
				ubicacionId: linea.stock_ubicacion_id!,
				cantidad: linea.cantidad
			});
		}

		await registrarCambioEstado(tx, {
			flujo: 'pedido',
			entidadId: pedido.id,
			usuarioId,
			anteriorId: null,
			nuevoId: estadoInicial.id,
			comentario: 'Pedido creado'
		});
		return pedido;
	});
}

async function aplicarEfectosEstado(
	tx: Tx,
	pedido: typeof pedidos.$inferSelect,
	destino: { slug: string; es_final: boolean },
	usuarioId: number
) {
	if (destino.slug !== PEDIDO_SLUG.ENTREGADO) {
		if (destino.es_final) await procesarReservasPedidoTx(tx, pedido.id, 'liberar', usuarioId);
		return {};
	}

	const comision = Number(pedido.monto_comision_distribuidor ?? 0);
	const descuentaComision =
		pedido.contacto_distribuidor_id && !pedido.comision_distribuidor_descontada && comision > 0;
	if (descuentaComision) {
		const [distribuidor] = await tx
			.update(contactos)
			.set({ saldo_disponible: sql`${contactos.saldo_disponible} - ${comision}` })
			.where(
				and(
					eq(contactos.id, pedido.contacto_distribuidor_id!),
					gte(contactos.saldo_disponible, comision)
				)
			)
			.returning({ id: contactos.id });
		if (!distribuidor) {
			error(409, 'El saldo del distribuidor no alcanza para descontar la comisión');
		}
	}
	await procesarReservasPedidoTx(tx, pedido.id, 'consumir', usuarioId);
	return {
		fecha_entrega_real: new Date(),
		...(descuentaComision && { comision_distribuidor_descontada: true })
	};
}

export async function cambiarEstadoPedidoServicio(
	{
		pedido_id,
		estado_destino_id,
		comentario
	}: { pedido_id: number; estado_destino_id: number; comentario?: string },
	usuarioId: number
) {
	await db.transaction(async (tx) => {
		const pedido = await bloquearPedido(tx, pedido_id);
		const destino = await validarTransicion(tx, pedido.estado_id, estado_destino_id);
		const efectos = await aplicarEfectosEstado(tx, pedido, destino, usuarioId);

		await tx
			.update(pedidos)
			.set({ estado_id: destino.id, ...efectos })
			.where(eq(pedidos.id, pedido_id));
		await registrarCambioEstado(tx, {
			flujo: 'pedido',
			entidadId: pedido_id,
			usuarioId,
			anteriorId: pedido.estado_id,
			nuevoId: destino.id,
			comentario
		});
		await avisarCambioEstadoPedido(pedido_id, destino, usuarioId, tx);
	});
	return { success: true };
}

export async function moverPedidoAutomatico(
	tx: Tx,
	pedidoId: number,
	{
		desde,
		hacia,
		usuarioId,
		comentario
	}: { desde?: string[]; hacia: string; usuarioId: number; comentario: string }
) {
	const destino = await estadoPorSlug('pedido', hacia, tx);
	const [pedido] = await tx
		.select({ estado_id: pedidos.estado_id, slug: estados.slug })
		.from(pedidos)
		.innerJoin(estados, eq(estados.id, pedidos.estado_id))
		.where(eq(pedidos.id, pedidoId))
		.for('update', { of: pedidos });
	if (!pedido || pedido.estado_id === destino.id || (desde && !desde.includes(pedido.slug))) return;

	await tx.update(pedidos).set({ estado_id: destino.id }).where(eq(pedidos.id, pedidoId));
	await registrarCambioEstado(tx, {
		flujo: 'pedido',
		entidadId: pedidoId,
		usuarioId,
		anteriorId: pedido.estado_id,
		nuevoId: destino.id,
		comentario
	});
	await avisarCambioEstadoPedido(pedidoId, destino, usuarioId, tx);
}

export async function getPedidosActivosServicio({ semana }: { semana?: boolean }) {
	let rangoSemana;
	if (semana) {
		const inicio = new Date();
		inicio.setDate(inicio.getDate() - inicio.getDay());
		inicio.setHours(0, 0, 0, 0);
		const fin = new Date(inicio);
		fin.setDate(inicio.getDate() + 6);
		fin.setHours(23, 59, 59, 999);
		rangoSemana = and(
			gte(pedidos.fecha_entrega_prometida, inicio),
			lte(pedidos.fecha_entrega_prometida, fin)
		);
	}

	return db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_nombre: contactos.razon_social,
			estado_nombre: estados.nombre,
			estado_color: estados.color,
			fecha_entrega_prometida: pedidos.fecha_entrega_prometida,
			total: pedidos.precio_total,
			saldo_pendiente:
				sql<number>`greatest(coalesce(${pedidos.precio_total}, 0) - coalesce(${pedidos.monto_credito_distribuidor}, 0) - ${pagadoPedido}, 0)`.mapWith(
					Number
				)
		})
		.from(pedidos)
		.innerJoin(estados, eq(pedidos.estado_id, estados.id))
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.where(and(notInArray(estados.grupo, ['final', 'excepcion']), rangoSemana));
}

export function getLineasPedidoSinOrdenServicio({
	pedido_id,
	limit = 50
}: {
	pedido_id?: number;
	limit?: number;
}) {
	return db
		.select({
			id: lineas_pedido.id,
			pedido_numero: pedidos.numero_pedido,
			producto_nombre: productos.nombre,
			cantidad: lineas_pedido.cantidad,
			descripcion: lineas_pedido.descripcion_personalizada,
			es_personalizado: lineas_pedido.es_personalizado
		})
		.from(lineas_pedido)
		.innerJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
		.leftJoin(
			reservas_stock,
			and(
				eq(reservas_stock.linea_pedido_id, lineas_pedido.id),
				eq(reservas_stock.estado, 'reservada')
			)
		)
		.where(
			and(
				isNull(ordenes_fabricacion.id),
				isNull(reservas_stock.id),
				pedido_id ? eq(lineas_pedido.pedido_id, pedido_id) : undefined
			)
		)
		.limit(limit);
}
