import * as v from 'valibot';
import { db } from '$lib/server/db';
import {
	pedidos,
	lineas_pedido,
	pedido_insumos,
	estados_pedido,
	productos,
	insumos,
	ordenes_fabricacion,
	unidades_fabricacion,
	estados_fabricacion,
	logs_cambios_estado,
	transiciones_estado,
	empleados,
	usuarios,
	cotizaciones,
	contactos
} from '$lib/server/db/schema';
import {
	and,
	desc,
	eq,
	exists,
	gte,
	inArray,
	ilike,
	lte,
	not,
	or,
	sql,
	SQL,
	aliasedTable
} from 'drizzle-orm';
import { generarNumeroPedido } from '$lib/server/utils/pedidos';
import { PEDIDO_SLUG } from '$lib/types';
import { getCurrentUser } from '$lib/remote/usuarios.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import {
	obtenerTransicionPedidoPermitida,
	aplicarCambioPedidoEstado
} from '$lib/server/services/pedidos-estado.service';

export const LineaPedidoSchema = v.object({
	producto_id: v.string(),
	cantidad: v.pipe(v.number(), v.toMinValue(1)),
	precio: v.pipe(v.number(), v.toMinValue(0)),
	descripcion: v.optional(v.string())
});

export const PedidoSchema = v.object({
	contacto_id: v.pipe(v.string(), v.toNumber()),
	contacto_distribuidor_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	usar_credito_distribuidor: v.optional(v.boolean(), false),
	monto_credito_distribuidor: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	porcentaje_comision_distribuidor: v.optional(
		v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		0
	),
	lineas: v.pipe(v.array(LineaPedidoSchema), v.minLength(1)),
	fecha_entrega_prometida: v.optional(v.string()),
	anticipo: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	observaciones: v.optional(v.string())
});

export const crearCondicionBusquedaPedido = ({
	search,
	estadoId
}: {
	search?: string;
	estadoId?: number;
}) => {
	if (search && estadoId) {
		return and(ilike(pedidos.numero_pedido, `%${search}%`), eq(pedidos.estado_id, estadoId));
	}

	if (search) {
		return ilike(pedidos.numero_pedido, `%${search}%`);
	}

	if (estadoId) {
		return eq(pedidos.estado_id, estadoId);
	}

	return undefined;
};

export const calcularTotalesPedido = ({
	lineas,
	anticipo,
	empresaDistribuidorId,
	usarCreditoDistribuidor,
	montoCreditoDistribuidor
}: {
	lineas: { cantidad: number; precio: number }[];
	anticipo: number;
	empresaDistribuidorId?: number | null;
	usarCreditoDistribuidor?: boolean;
	montoCreditoDistribuidor?: number;
}) => {
	const precio_total = Number(
		lineas.reduce((suma, linea) => suma + linea.cantidad * linea.precio, 0).toFixed(2)
	);
	const monto_credito =
		empresaDistribuidorId && usarCreditoDistribuidor
			? Math.min(Number(montoCreditoDistribuidor ?? 0), precio_total)
			: 0;
	const saldo_pendiente = Number(Math.max(precio_total - anticipo - monto_credito, 0).toFixed(2));

	return { precio_total, monto_credito, saldo_pendiente };
};

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
				nombre: contactos.razon_social,
				apellido: sql<string | null>`NULL`,
				razon_social: contactos.razon_social
			},
			fecha: pedidos.fecha_pedido,
			observaciones: pedidos.observaciones,
			anticipo: pedidos.anticipo,
			total: pedidos.precio_total,
			estado: {
				id: pedidos.estado_id,
				nombre: estados_pedido.nombre,
				color: estados_pedido.color
			}
		})
		.from(pedidos)
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.where(eq(pedidos.id, id))
		.limit(1);

	if (!pedido) throw new Error('Pedido no encontrado');

	const transiciones = await db
		.select({
			id: transiciones_estado.id,
			estado_destino_id: transiciones_estado.estado_destino_id,
			requiere_rol: transiciones_estado.requiere_rol,
			destino_nombre: estados_pedido.nombre,
			destino_slug: estados_pedido.slug,
			destino_color: estados_pedido.color
		})
		.from(transiciones_estado)
		.innerJoin(estados_pedido, eq(transiciones_estado.estado_destino_id, estados_pedido.id))
		.where(
			and(
				eq(transiciones_estado.tipo, 'pedido'),
				eq(transiciones_estado.estado_origen_id, pedido.estado.id)
			)
		);

	const lineas = await db
		.select({
			id: lineas_pedido.id,
			cantidad: lineas_pedido.cantidad,
			precio_unitario: lineas_pedido.precio_unitario,
			subtotal: lineas_pedido.subtotal,
			es_personalizado: lineas_pedido.es_personalizado,
			descripcion_personalizada: lineas_pedido.descripcion_personalizada,
			producto_id: lineas_pedido.producto_id,
			producto_codigo: productos.codigo,
			producto_nombre: productos.nombre,
			orden_id: ordenes_fabricacion.id
		})
		.from(lineas_pedido)
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.leftJoin(ordenes_fabricacion, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(lineas_pedido.pedido_id, id));

	const lineasConProduccion = await Promise.all(
		lineas.map(async (linea) => {
			if (!linea.orden_id) return { ...linea, produccion: null };

			const [unidades, estadosFab] = await Promise.all([
				db
					.select({ estado_id: unidades_fabricacion.estado_id })
					.from(unidades_fabricacion)
					.where(eq(unidades_fabricacion.orden_fabricacion_id, linea.orden_id)),
				db.select().from(estados_fabricacion)
			]);

			const terminadas = unidades.filter(
				(u) => estadosFab.find((e) => e.id === u.estado_id)?.es_final
			).length;
			const total = unidades.length;

			return {
				...linea,
				produccion: {
					orden_id: linea.orden_id,
					terminadas,
					total,
					es_final: terminadas === total && total > 0
				}
			};
		})
	);

	const insumosAdicionales = await db
		.select({
			id: pedido_insumos.id,
			insumo_id: pedido_insumos.insumo_id,
			codigo: insumos.codigo,
			nombre: insumos.nombre,
			cantidad: pedido_insumos.cantidad,
			unidad: pedido_insumos.unidad,
			costo_unitario: pedido_insumos.costo_unitario
		})
		.from(pedido_insumos)
		.innerJoin(insumos, eq(pedido_insumos.insumo_id, insumos.id))
		.where(eq(pedido_insumos.pedido_id, id));

	const [cotizacion] = await db
		.select({ id: cotizaciones.id })
		.from(cotizaciones)
		.where(eq(cotizaciones.pedido_id, id))
		.limit(1);
	const ordenes = lineasConProduccion
		.filter((linea) => linea.produccion)
		.map((linea) => linea.produccion!.orden_id);

	return {
		pedido: {
			...pedido,
			transiciones,
			navegacion: {
				cotizacion_id: cotizacion?.id ?? null,
				orden_fabricacion_id: ordenes.length === 1 ? ordenes[0] : null
			}
		},
		lineas: lineasConProduccion,
		insumosAdicionales
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
	const offset = (page - 1) * limit;
	const where = crearCondicionBusquedaPedido({ search, estadoId });

	const data = await db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_nombre: contactos.razon_social,
			fecha_pedido: pedidos.fecha_pedido,
			fecha_entrega: pedidos.fecha_entrega_prometida,
			total: pedidos.precio_total,
			estado_id: pedidos.estado_id,
			estado_nombre: estados_pedido.nombre,
			estado_color: estados_pedido.color
		})
		.from(pedidos)
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.where(where)
		.orderBy(desc(pedidos.id))
		.limit(limit)
		.offset(offset);

	const [totalResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(pedidos)
		.where(where);

	return {
		data,
		total: totalResult?.count || 0,
		totalPages: Math.ceil((totalResult?.count || 0) / limit),
		currentPage: page
	};
}

export async function getHistorialPedidoServicio(pedidoId: number) {
	const estadoAnterior = aliasedTable(estados_pedido, 'estado_anterior');
	const estadoNuevo = aliasedTable(estados_pedido, 'estado_nuevo');

	return await db
		.select({
			id: logs_cambios_estado.id,
			estado_anterior: {
				nombre: estadoAnterior.nombre,
				color: estadoAnterior.color
			},
			estado_nuevo: {
				nombre: estadoNuevo.nombre,
				color: estadoNuevo.color
			},
			comentario: logs_cambios_estado.comentario,
			fecha: logs_cambios_estado.created_at,
			empleado: empleados.nombre
		})
		.from(logs_cambios_estado)
		.leftJoin(usuarios, eq(logs_cambios_estado.usuario_id, usuarios.id))
		.leftJoin(empleados, eq(usuarios.empleado_id, empleados.id))
		.leftJoin(estadoAnterior, eq(logs_cambios_estado.estado_anterior_id, estadoAnterior.id))
		.leftJoin(estadoNuevo, eq(logs_cambios_estado.estado_nuevo_id, estadoNuevo.id))
		.where(
			and(
				eq(logs_cambios_estado.entidad_tipo, 'pedido'),
				eq(logs_cambios_estado.entidad_id, pedidoId)
			)
		)
		.orderBy(desc(logs_cambios_estado.created_at));
}

export async function crearPedidoServicio(data: {
	contacto_id: number;
	contacto_distribuidor_id?: number | null;
	usar_credito_distribuidor?: boolean;
	monto_credito_distribuidor?: number;
	porcentaje_comision_distribuidor?: number;
	lineas: { producto_id: string; cantidad: number; precio: number; descripcion?: string }[];
	fecha_entrega_prometida?: string;
	anticipo?: number;
	observaciones?: string;
}) {
	const user = await getCurrentUser();
	if (!user) throw new Error('Usuario no autenticado');

	await requirePermission('pedidos', 'create');

	const numero_pedido = await generarNumeroPedido();
	const { precio_total, monto_credito, saldo_pendiente } = calcularTotalesPedido({
		lineas: data.lineas,
		anticipo: data.anticipo ?? 0,
		empresaDistribuidorId: data.contacto_distribuidor_id,
		usarCreditoDistribuidor: data.usar_credito_distribuidor,
		montoCreditoDistribuidor: data.monto_credito_distribuidor
	});
	const porcentajeComision = Number(data.porcentaje_comision_distribuidor ?? 0);
	const montoComision = Number((precio_total * (porcentajeComision / 100)).toFixed(2));

	const [pedido] = await db
		.insert(pedidos)
		.values({
			contacto_id: data.contacto_id,
			contacto_distribuidor_id:
				data.contacto_distribuidor_id && data.contacto_distribuidor_id > 0
					? data.contacto_distribuidor_id
					: null,
			usar_credito_distribuidor: Boolean(
				data.contacto_distribuidor_id && data.usar_credito_distribuidor
			),
			monto_credito_distribuidor: monto_credito,
			porcentaje_comision_distribuidor: porcentajeComision,
			monto_comision_distribuidor: montoComision,
			numero_pedido,
			fecha_pedido: new Date(),
			fecha_entrega_prometida: data.fecha_entrega_prometida
				? new Date(data.fecha_entrega_prometida)
				: null,
			estado_id: 1,
			precio_total,
			anticipo: data.anticipo ?? 0,
			saldo_pendiente,
			observaciones: data.observaciones
		})
		.returning();

	for (const linea of data.lineas) {
		await db.insert(lineas_pedido).values({
			pedido_id: pedido.id,
			producto_id: linea.producto_id === 'personalizado' ? null : parseInt(linea.producto_id),
			cantidad: linea.cantidad,
			precio_unitario: Number(linea.precio.toFixed(2)),
			es_personalizado: linea.producto_id === 'personalizado',
			descripcion_personalizada: linea.descripcion
		});
	}

	await db.insert(logs_cambios_estado).values({
		entidad_tipo: 'pedido',
		entidad_id: pedido.id,
		usuario_id: user.id,
		estado_anterior_id: pedido.estado_id,
		estado_nuevo_id: pedido.estado_id,
		comentario: 'Pedido creado',
		created_at: new Date()
	});

	return pedido;
}

export async function cambiarEstadoPedidoServicio({
	pedido_id,
	estado_destino_id,
	comentario
}: {
	pedido_id: number;
	estado_destino_id: number;
	comentario?: string;
}) {
	await requirePermission('pedidos', 'edit');
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const now = new Date();
	const pedido = await db
		.select()
		.from(pedidos)
		.where(eq(pedidos.id, pedido_id))
		.then((rows) => rows[0]);
	if (!pedido) throw new Error('Pedido no encontrado');

	const transicion = await obtenerTransicionPedidoPermitida({
		estadoOrigenId: pedido.estado_id,
		estadoDestinoId: estado_destino_id
	});

	if (!transicion) throw new Error('Transición no permitida');

	await db.transaction(async (tx) => {
		const [pedidoBloqueado] = await tx
			.select()
			.from(pedidos)
			.where(eq(pedidos.id, pedido_id))
			.for('update');
		if (!pedidoBloqueado) throw new Error('Pedido no encontrado');

		const estadoDestino = await tx
			.select({ slug: estados_pedido.slug })
			.from(estados_pedido)
			.where(eq(estados_pedido.id, estado_destino_id))
			.then((r) => r[0]);
		const updates: Partial<typeof pedidos.$inferSelect> = {
			estado_id: estado_destino_id,
			updated_at: now
		};

		if (estadoDestino?.slug === PEDIDO_SLUG.ENTREGADO) {
			updates.fecha_entrega_real = now;
			const contactoDistribuidorId = pedidoBloqueado.contacto_distribuidor_id;

			if (
				contactoDistribuidorId &&
				!pedidoBloqueado.comision_distribuidor_descontada &&
				Number(pedidoBloqueado.monto_comision_distribuidor ?? 0) > 0
			) {
				const montoComision = Number(pedidoBloqueado.monto_comision_distribuidor ?? 0);
				const [distribuidor] = await tx
					.update(contactos)
					.set({
						saldo_disponible: sql`GREATEST(COALESCE(${contactos.saldo_disponible}, 0) - ${montoComision}, 0)`,
						updated_at: now
					})
					.where(
						and(
							eq(contactos.id, contactoDistribuidorId),
							gte(contactos.saldo_disponible, montoComision)
						)
					)
					.returning({ saldo_disponible: contactos.saldo_disponible });

				if (!distribuidor) {
					throw new Error('El saldo del distribuidor no alcanza para descontar la comisión');
				}
				updates.comision_distribuidor_descontada = true;
			}
		}

		await aplicarCambioPedidoEstado({
			tx,
			entidadId: pedido_id,
			usuarioId: user.id,
			estadoAnteriorId: pedido.estado_id,
			estadoNuevoId: estado_destino_id,
			comentario: comentario ?? null,
			createdAt: now,
			actualizarEntidad: async (txInner) => {
				await txInner.update(pedidos).set(updates).where(eq(pedidos.id, pedido_id));
			}
		});
	});

	return { success: true };
}

export async function getPedidosActivosServicio({ semana }: { semana?: boolean }) {
	const estadosFinales = await db
		.select({ id: estados_pedido.id })
		.from(estados_pedido)
		.where(or(eq(estados_pedido.grupo, 'final'), eq(estados_pedido.grupo, 'excepcion')));

	const idsFinales = estadosFinales.map((e) => e.id);
	let where: SQL<unknown> | undefined = sql`true;`;

	if (idsFinales.length > 0) {
		where = not(inArray(pedidos.estado_id, idsFinales));
	}

	if (semana) {
		const hoy = new Date();
		const inicioSemana = new Date(hoy);
		inicioSemana.setDate(hoy.getDate() - hoy.getDay());
		inicioSemana.setHours(0, 0, 0, 0);
		const finSemana = new Date(inicioSemana);
		finSemana.setDate(inicioSemana.getDate() + 6);
		finSemana.setHours(23, 59, 59, 999);

		where = and(
			where,
			gte(pedidos.fecha_entrega_prometida, inicioSemana),
			lte(pedidos.fecha_entrega_prometida, finSemana)
		);
	}

	return db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			cliente_nombre: contactos.razon_social,
			estado_nombre: estados_pedido.nombre,
			estado_color: estados_pedido.color,
			fecha_entrega_prometida: pedidos.fecha_entrega_prometida,
			total: pedidos.precio_total,
			saldo_pendiente: pedidos.saldo_pendiente
		})
		.from(pedidos)
		.leftJoin(contactos, eq(pedidos.contacto_id, contactos.id))
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.where(where);
}

export async function getEstadosPedidoServicio() {
	return await db.select().from(estados_pedido).orderBy(estados_pedido.nombre);
}

export async function getLineasPedidoSinOrdenServicio({
	pedido_id,
	limit = 50
}: {
	pedido_id?: number;
	limit?: number;
}) {
	const conditions = [];

	if (pedido_id) {
		conditions.push(eq(lineas_pedido.pedido_id, pedido_id));
	}

	return await db
		.select({
			id: lineas_pedido.id,
			pedido_numero: pedidos.numero_pedido,
			producto_nombre: productos.nombre,
			cantidad: lineas_pedido.cantidad,
			descripcion: lineas_pedido.descripcion_personalizada,
			es_personalizado: lineas_pedido.es_personalizado
		})
		.from(lineas_pedido)
		.leftJoin(pedidos, eq(lineas_pedido.pedido_id, pedidos.id))
		.leftJoin(productos, eq(lineas_pedido.producto_id, productos.id))
		.where(
			and(
				not(
					exists(
						db
							.select()
							.from(ordenes_fabricacion)
							.where(eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
					)
				),
				...conditions
			)
		)
		.limit(limit);
}
