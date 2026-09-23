import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	lineas_cotizacion,
	adjuntos_cotizacion,
	estados_cotizacion,
	contactos,
	empleados,
	usuarios,
	roles,
	permisos,
	roles_permisos,
	pedidos,
	lineas_pedido,
	pedido_insumos,
	ordenes_fabricacion,
	estados_pedido,
	productos,
	logs_cambios_estado,
	transiciones_estado,
	notificaciones,
	insumos,
	producto_insumos
} from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { and, count, desc, eq, ilike, or, sql, aliasedTable } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { getCurrentUser } from './usuarios.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { CotizacionSchema, LineaCotizacionSchema } from './cotizaciones.schema';
import { getProductoConReceta } from './productos.remote';
import {
	aplicarCambioDeEstado,
	calcularTotalLineas,
	obtenerTransicionPermitida,
	redondearMoneda,
	registrarCambioEstado
} from '$lib/server/utils/estado-negocio';

const UPLOAD_DIR = env.UPLOAD_DIR || 'static/uploads/cotizaciones';

function obtenerRutaAdjunto(archivoUrl: string) {
	const uploadDir = path.resolve(UPLOAD_DIR);
	const filePath = path.resolve(uploadDir, path.basename(archivoUrl));

	if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
		throw new Error('Ruta de adjunto no válida');
	}

	return filePath;
}

async function eliminarArchivoAdjunto(archivoUrl: string) {
	try {
		await unlink(obtenerRutaAdjunto(archivoUrl));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
}

async function generarNumeroCotizacion() {
	const existentes = await db
		.select({ numero: cotizaciones.numero_cotizacion })
		.from(cotizaciones)
		.orderBy(desc(cotizaciones.id));

	const mayorNumero = existentes.reduce((maximo, cotizacion) => {
		const match = cotizacion.numero.match(/^C-(\d+)$/);
		return match ? Math.max(maximo, Number(match[1])) : maximo;
	}, 0);

	return `C-${(mayorNumero + 1).toString().padStart(5, '0')}`;
}

async function obtenerEstadoPorSlug(slug: string) {
	const [estado] = await db
		.select()
		.from(estados_cotizacion)
		.where(eq(estados_cotizacion.slug, slug))
		.limit(1);
	return estado;
}

const crearCondicionBusquedaCotizacion = ({
	search,
	estadoId,
	asignadaA
}: {
	search?: string;
	estadoId?: number;
	asignadaA?: number;
}) => {
	const condiciones = [];

	if (search) {
		const termino = `%${search}%`;
		condiciones.push(
			or(
				ilike(cotizaciones.numero_cotizacion, termino),
				ilike(cotizaciones.cliente_nombre, termino),
				ilike(contactos.razon_social, termino),
				ilike(contactos.cuit, termino)
			)
		);
	}

	if (estadoId) condiciones.push(eq(cotizaciones.estado_id, estadoId));
	if (asignadaA) condiciones.push(eq(cotizaciones.asignada_a, asignadaA));

	return condiciones.length ? and(...condiciones) : undefined;
};

async function notificarUsuariosConPermiso(
	modulo: string,
	accion: string,
	titulo: string,
	mensaje: string,
	link: string
) {
	const destinatarios = await db
		.select({ usuario_id: usuarios.id })
		.from(usuarios)
		.innerJoin(roles, eq(usuarios.rol_id, roles.id))
		.innerJoin(roles_permisos, eq(roles_permisos.rol_id, roles.id))
		.innerJoin(
			permisos,
			and(
				eq(permisos.id, roles_permisos.permiso_id),
				eq(permisos.modulo, modulo),
				eq(permisos.accion, accion)
			)
		)
		.where(eq(usuarios.activo, true));

	if (destinatarios.length === 0) return;

	await db.insert(notificaciones).values(
		destinatarios.map((d) => ({
			usuario_id: d.usuario_id,
			titulo,
			mensaje,
			link
		}))
	);
}

async function notificarEmpleado(
	empleadoId: number | null,
	titulo: string,
	mensaje: string,
	link: string
) {
	if (!empleadoId) return;

	const [usuario] = await db
		.select({ id: usuarios.id })
		.from(usuarios)
		.where(eq(usuarios.empleado_id, empleadoId))
		.limit(1);

	if (!usuario) return;

	await db.insert(notificaciones).values({ usuario_id: usuario.id, titulo, mensaje, link });
}

async function notificarCambioEstadoCotizacion({
	cotizacionId,
	numeroCotizacion,
	clienteNombre,
	estadoDestinoSlug
}: {
	cotizacionId: number;
	numeroCotizacion: string;
	clienteNombre: string | null;
	estadoDestinoSlug?: string | null;
}) {
	if (!estadoDestinoSlug) return;

	if (estadoDestinoSlug === 'lista_para_enviar') {
		await notificarUsuariosConPermiso(
			'cotizaciones',
			'enviar',
			'Cotización lista para enviar',
			`La cotización ${numeroCotizacion} (${clienteNombre}) está lista para enviar al cliente.`,
			`/cotizaciones/${cotizacionId}`
		);
		return;
	}

	if (estadoDestinoSlug === 'aprobada') {
		await notificarUsuariosConPermiso(
			'cotizaciones',
			'convertir',
			'Cotización aprobada',
			`El cliente aprobó la cotización ${numeroCotizacion}. Ya podés generar el pedido.`,
			`/cotizaciones/${cotizacionId}`
		);
	}
}

export const getCotizaciones = query(
	v.object({
		search: v.optional(v.string()),
		estadoId: v.optional(v.number()),
		asignadaA: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 10)
	}),
	async ({ search, estadoId, asignadaA, page = 1, limit = 10 }) => {
		const offset = (page - 1) * limit;
		const where = crearCondicionBusquedaCotizacion({ search, estadoId, asignadaA });

		const data = await db
			.select({
				id: cotizaciones.id,
				numero_cotizacion: cotizaciones.numero_cotizacion,
				cliente_nombre: sql<string>`
					COALESCE(
						${contactos.razon_social},
						${cotizaciones.cliente_nombre}
					)`.as('cliente_nombre'),
				canal: cotizaciones.canal,
				created_at: cotizaciones.created_at,
				precio_total: cotizaciones.precio_total,
				estado_id: cotizaciones.estado_id,
				estado_nombre: estados_cotizacion.nombre,
				estado_color: estados_cotizacion.color,
				estado_slug: estados_cotizacion.slug,
				asignado_nombre: empleados.nombre,
				asignado_apellido: empleados.apellido
			})
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.leftJoin(estados_cotizacion, eq(cotizaciones.estado_id, estados_cotizacion.id))
			.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
			.where(where)
			.orderBy(desc(cotizaciones.id))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db.select({ count: count() }).from(cotizaciones).where(where);

		return {
			data,
			total: totalResult?.count || 0,
			totalPages: Math.ceil((totalResult?.count || 0) / limit),
			currentPage: page
		};
	}
);

export const getCotizacionById = query(v.number(), async (id) => {
	const [cotizacion] = await db
		.select({
			id: cotizaciones.id,
			numero_cotizacion: cotizaciones.numero_cotizacion,
			canal: cotizaciones.canal,
			descripcion: cotizaciones.descripcion,
			observaciones: cotizaciones.observaciones,
			precio_total: cotizaciones.precio_total,
			validez_dias: cotizaciones.validez_dias,
			fecha_envio: cotizaciones.fecha_envio,
			created_at: cotizaciones.created_at,
			pedido_id: cotizaciones.pedido_id,
			cliente: {
				id: contactos.id,
				nombre: contactos.razon_social,
				apellido: sql<string | null>`NULL`,
				razon_social: contactos.razon_social,
				telefono: contactos.telefono,
				email: contactos.email
			},
			cliente_nombre: cotizaciones.cliente_nombre,
			cliente_telefono: cotizaciones.cliente_telefono,
			cliente_email: cotizaciones.cliente_email,
			estado: {
				id: cotizaciones.estado_id,
				nombre: estados_cotizacion.nombre,
				color: estados_cotizacion.color,
				slug: estados_cotizacion.slug
			},
			asignado: {
				id: empleados.id,
				nombre: empleados.nombre,
				apellido: empleados.apellido
			},
			creada_por: usuarios.username
		})
		.from(cotizaciones)
		.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
		.leftJoin(estados_cotizacion, eq(cotizaciones.estado_id, estados_cotizacion.id))
		.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
		.leftJoin(usuarios, eq(cotizaciones.creada_por, usuarios.id))
		.where(eq(cotizaciones.id, id))
		.limit(1);

	if (!cotizacion) throw new Error('Cotización no encontrada');

	// Transiciones permitidas desde el estado actual
	const transiciones = await db
		.select({
			id: transiciones_estado.id,
			estado_destino_id: transiciones_estado.estado_destino_id,
			destino_nombre: estados_cotizacion.nombre,
			destino_slug: estados_cotizacion.slug,
			destino_color: estados_cotizacion.color
		})
		.from(transiciones_estado)
		.innerJoin(estados_cotizacion, eq(transiciones_estado.estado_destino_id, estados_cotizacion.id))
		.where(
			and(
				eq(transiciones_estado.tipo, 'cotizacion'),
				eq(transiciones_estado.estado_origen_id, cotizacion.estado.id)
			)
		);

	const lineas = await db
		.select({
			id: lineas_cotizacion.id,
			producto_id: lineas_cotizacion.producto_id,
			insumo_id: lineas_cotizacion.insumo_id,
			producto_nombre: productos.nombre,
			insumo_nombre: insumos.nombre,
			insumo_unidad: insumos.unidad,
			es_personalizado: lineas_cotizacion.es_personalizado,
			descripcion: lineas_cotizacion.descripcion,
			cantidad: lineas_cotizacion.cantidad,
			precio_unitario: lineas_cotizacion.precio_unitario,
			subtotal: lineas_cotizacion.subtotal,
			costo_mano_obra: lineas_cotizacion.costo_mano_obra,
			costo_materiales: lineas_cotizacion.costo_materiales,
			insumos_snapshot: lineas_cotizacion.insumos_snapshot
		})
		.from(lineas_cotizacion)
		.leftJoin(productos, eq(lineas_cotizacion.producto_id, productos.id))
		.leftJoin(insumos, eq(lineas_cotizacion.insumo_id, insumos.id))
		.where(eq(lineas_cotizacion.cotizacion_id, id))
		.orderBy(lineas_cotizacion.orden_linea);

	const adjuntos = await db
		.select()
		.from(adjuntos_cotizacion)
		.where(eq(adjuntos_cotizacion.cotizacion_id, id))
		.orderBy(desc(adjuntos_cotizacion.id));

	const ordenes = cotizacion.pedido_id
		? await db
				.select({ id: ordenes_fabricacion.id })
				.from(ordenes_fabricacion)
				.innerJoin(lineas_pedido, eq(ordenes_fabricacion.linea_pedido_id, lineas_pedido.id))
				.where(eq(lineas_pedido.pedido_id, cotizacion.pedido_id))
				.limit(2)
		: [];

	return {
		cotizacion: {
			...cotizacion,
			transiciones,
			navegacion: {
				pedido_id: cotizacion.pedido_id,
				orden_fabricacion_id: ordenes.length === 1 ? ordenes[0].id : null
			}
		},
		lineas,
		adjuntos
	};
});

export const getEstadosCotizacion = query(async () => {
	return await db.select().from(estados_cotizacion).orderBy(estados_cotizacion.orden);
});

export const getHistorialCotizacion = query(v.number(), async (cotizacionId) => {
	const estadoAnterior = aliasedTable(estados_cotizacion, 'estado_anterior');
	const estadoNuevo = aliasedTable(estados_cotizacion, 'estado_nuevo');

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
				eq(logs_cambios_estado.entidad_tipo, 'cotizacion'),
				eq(logs_cambios_estado.entidad_id, cotizacionId)
			)
		)
		.orderBy(desc(logs_cambios_estado.created_at));
});

// ============================================================
// NOTIFICACIONES
// ============================================================

export const getNotificaciones = query(async () => {
	const user = await getCurrentUser();
	if (!user) return [];

	return await db
		.select()
		.from(notificaciones)
		.where(eq(notificaciones.usuario_id, user.id))
		.orderBy(desc(notificaciones.created_at))
		.limit(50);
});

export const marcarNotificacionesLeidas = command(async () => {
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	await db
		.update(notificaciones)
		.set({ leida: true })
		.where(and(eq(notificaciones.usuario_id, user.id), eq(notificaciones.leida, false)));

	getNotificaciones().refresh();
	return { success: true };
});

// ============================================================
// FORMS
// ============================================================

export const crearCotizacion = form(CotizacionSchema, async (data) => {
	await requirePermission('cotizaciones', 'create');
	const user = await getCurrentUser();
	if (!user) throw new Error('Usuario no autenticado');

	const estadoInicial = await obtenerEstadoPorSlug('ingresada');
	if (!estadoInicial) throw new Error('No existe el estado inicial "ingresada"');

	const [cotizacion] = await db
		.insert(cotizaciones)
		.values({
			numero_cotizacion: await generarNumeroCotizacion(),
			contacto_id: data.contacto_id && data.contacto_id > 0 ? data.contacto_id : null,
			contacto_distribuidor_id:
				data.contacto_distribuidor_id && data.contacto_distribuidor_id > 0
					? data.contacto_distribuidor_id
					: null,
			cliente_nombre: data.cliente_nombre,
			cliente_telefono: data.cliente_telefono || null,
			cliente_email: data.cliente_email || null,
			canal: data.canal,
			descripcion: data.descripcion,
			observaciones: data.observaciones || null,
			estado_id: estadoInicial.id,
			creada_por: user.id
		})
		.returning();

	getCotizaciones({ search: '', page: 1 }).refresh();

	redirect(303, resolve(`/cotizaciones/${cotizacion.id}`));
});

// ============================================================
// COMMANDS
// ============================================================

export const asignarCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		empleado_id: v.number()
	}),
	async ({ cotizacion_id, empleado_id }) => {
		await requirePermission('cotizaciones', 'asignar');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		const [cotizacion] = await db
			.select()
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id))
			.limit(1);

		if (!cotizacion) throw new Error('Cotización no encontrada');

		await db
			.update(cotizaciones)
			.set({ asignada_a: empleado_id, updated_at: now })
			.where(eq(cotizaciones.id, cotizacion_id));

		const estadoAsignada = await obtenerEstadoPorSlug('asignada');
		if (estadoAsignada && estadoAsignada.id !== cotizacion.estado_id) {
			const transicion = await obtenerTransicionPermitida({
				tipo: 'cotizacion',
				estadoOrigenId: cotizacion.estado_id,
				estadoDestinoId: estadoAsignada.id
			});

			if (transicion) {
				await db.transaction(async (tx) => {
					await tx
						.update(cotizaciones)
						.set({ estado_id: estadoAsignada.id, updated_at: now })
						.where(eq(cotizaciones.id, cotizacion_id));

					await registrarCambioEstado({
						tx,
						entidadTipo: 'cotizacion',
						entidadId: cotizacion_id,
						usuarioId: user.id,
						estadoAnteriorId: cotizacion.estado_id,
						estadoNuevoId: estadoAsignada.id,
						comentario: 'Cotización asignada',
						createdAt: now
					});
				});
			}
		}

		await notificarEmpleado(
			empleado_id,
			'Nueva cotización asignada',
			`La cotización ${cotizacion.numero_cotizacion} te fue asignada para revisar.`,
			`/cotizaciones/${cotizacion_id}`
		);

		getCotizaciones({ search: '', page: 1 }).refresh();
		getCotizacionById(cotizacion_id).refresh();

		return { success: true };
	}
);

export const cotizarCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		validez_dias: v.pipe(v.number(), v.toMinValue(1)),
		lineas: v.pipe(v.array(LineaCotizacionSchema), v.minLength(1, 'Agregá al menos una línea'))
	}),
	async ({ cotizacion_id, validez_dias, lineas }) => {
		await requirePermission('cotizaciones', 'cotizar');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const precio_total = calcularTotalLineas(lineas);

		await db.transaction(async (tx) => {
			await tx.delete(lineas_cotizacion).where(eq(lineas_cotizacion.cotizacion_id, cotizacion_id));

			for (const [i, linea] of lineas.entries()) {
				let descripcion = linea.descripcion;
				let costo_materiales = linea.costo_materiales || 0;
				let insumos_snapshot: unknown = null;

				if (linea.producto_id) {
					const { receta } = await getProductoConReceta(Number(linea.producto_id));

					insumos_snapshot = receta.map((material) => ({
						insumo_id: material.insumo_id,
						codigo: material.codigo,
						nombre: material.nombre,
						cantidad: material.cantidad,
						costo_unitario: material.costo_unitario ?? 0,
						unidad: material.unidad,
						subtotal: redondearMoneda((material.cantidad || 0) * (material.costo_unitario ?? 0))
					}));
					costo_materiales = redondearMoneda(
						receta.reduce<number>(
							(total, material) =>
								total + (material.cantidad || 0) * (material.costo_unitario ?? 0),
							0
						)
					);
				} else if (linea.insumo_id) {
					const [material] = await tx
						.select()
						.from(insumos)
						.where(eq(insumos.id, linea.insumo_id))
						.limit(1);
					if (!material) throw new Error('Insumo no encontrado');
					descripcion = material.nombre;
					costo_materiales = material.costo_unitario;
					insumos_snapshot = [
						{
							insumo_id: material.id,
							codigo: material.codigo,
							nombre: material.nombre,
							cantidad: 1,
							costo_unitario: material.costo_unitario,
							subtotal: material.costo_unitario,
							unidad: material.unidad
						}
					];
				}

				await tx.insert(lineas_cotizacion).values({
					cotizacion_id,
					producto_id: linea.producto_id ?? null,
					insumo_id: linea.insumo_id ?? null,
					es_personalizado: linea.es_personalizado ?? !linea.producto_id,
					descripcion,
					cantidad: linea.cantidad,
					precio_unitario: redondearMoneda(linea.precio_unitario || 0),
					costo_mano_obra: redondearMoneda(linea.costo_mano_obra || 0),
					costo_materiales: redondearMoneda(costo_materiales || 0),
					insumos_snapshot,
					orden_linea: i
				});
			}

			await tx
				.update(cotizaciones)
				.set({ precio_total, validez_dias, updated_at: new Date() })
				.where(eq(cotizaciones.id, cotizacion_id));
		});

		getCotizacionById(cotizacion_id).refresh();

		return { success: true };
	}
);

export const cambiarEstadoCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		estado_destino_id: v.number(),
		comentario: v.optional(v.string())
	}),
	async ({ cotizacion_id, estado_destino_id, comentario }) => {
		await requirePermission('cotizaciones', 'edit');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		const [cotizacion] = await db
			.select()
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id))
			.limit(1);

		if (!cotizacion) throw new Error('Cotización no encontrada');

		const transicion = await obtenerTransicionPermitida({
			tipo: 'cotizacion',
			estadoOrigenId: cotizacion.estado_id,
			estadoDestinoId: estado_destino_id
		});

		if (!transicion) throw new Error('Transición no permitida');

		const [estadoDestino] = await db
			.select()
			.from(estados_cotizacion)
			.where(eq(estados_cotizacion.id, estado_destino_id))
			.limit(1);

		await db.transaction(async (tx) => {
			const updates: Partial<typeof cotizaciones.$inferSelect> = {
				estado_id: estado_destino_id,
				updated_at: now
			};

			if (estadoDestino?.slug === 'enviada') {
				updates.fecha_envio = now;
			}

			await aplicarCambioDeEstado({
				tx,
				entidadTipo: 'cotizacion',
				entidadId: cotizacion_id,
				usuarioId: user.id,
				estadoAnteriorId: cotizacion.estado_id,
				estadoNuevoId: estado_destino_id,
				comentario: comentario ?? null,
				createdAt: now,
				actualizarEntidad: async (txActual: typeof tx) => {
					await txActual
						.update(cotizaciones)
						.set(updates)
						.where(eq(cotizaciones.id, cotizacion_id));
				}
			});
		});

		await notificarCambioEstadoCotizacion({
			cotizacionId: cotizacion_id,
			numeroCotizacion: cotizacion.numero_cotizacion,
			clienteNombre: cotizacion.cliente_nombre,
			estadoDestinoSlug: estadoDestino?.slug
		});

		getCotizaciones({ search: '', page: 1 }).refresh();
		getCotizacionById(cotizacion_id).refresh();
		getHistorialCotizacion(cotizacion_id).refresh();

		return { success: true };
	}
);

export const convertirCotizacionAPedido = command(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'convertir');
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const now = new Date();

	const [cotizacion] = await db
		.select()
		.from(cotizaciones)
		.where(eq(cotizaciones.id, cotizacionId))
		.limit(1);

	if (!cotizacion) throw new Error('Cotización no encontrada');

	if (cotizacion.pedido_id) {
		throw new Error('Esta cotización ya tiene un pedido generado');
	}

	if (!cotizacion.contacto_id) {
		throw new Error('La cotización debe tener una empresa vinculada para generar el pedido');
	}
	const empresaId = cotizacion.contacto_id;

	const estadoAprobada = await obtenerEstadoPorSlug('aprobada');
	if (estadoAprobada && cotizacion.estado_id !== estadoAprobada.id) {
		throw new Error('La cotización debe estar Aprobada para generar el pedido');
	}

	const lineas = await db
		.select()
		.from(lineas_cotizacion)
		.where(eq(lineas_cotizacion.cotizacion_id, cotizacionId))
		.orderBy(lineas_cotizacion.orden_linea);

	if (!lineas.length) throw new Error('La cotización no tiene líneas para producir');

	const [estadoPendiente] = await db
		.select({ id: estados_pedido.id })
		.from(estados_pedido)
		.where(eq(estados_pedido.slug, 'pendiente'))
		.limit(1);

	const precio_total = redondearMoneda(lineas.reduce((sum, l) => sum + (l.subtotal ?? 0), 0));

	// Variable para guardar el ID del pedido creado
	let pedidoId: number;

	await db.transaction(async (tx) => {
		const [pedido] = await tx
			.insert(pedidos)
			.values({
				numero_pedido: await generarNumeroPedido(),
				contacto_id: empresaId,
				contacto_distribuidor_id: cotizacion.contacto_distribuidor_id ?? null,
				fecha_pedido: now,
				estado_id: estadoPendiente?.id ?? 1,
				precio_total,
				saldo_pendiente: precio_total,
				observaciones: `Generado desde cotización ${cotizacion.numero_cotizacion}.${cotizacion.observaciones ? ' ' + cotizacion.observaciones : ''}`
			})
			.returning();

		pedidoId = pedido.id; // Asignar dentro de la transacción

		for (const linea of lineas) {
			if (!linea.producto_id && linea.insumo_id) {
				const [insumo] = await tx
					.select({ unidad: insumos.unidad, costo_unitario: insumos.costo_unitario })
					.from(insumos)
					.where(eq(insumos.id, linea.insumo_id))
					.limit(1);
				if (!insumo) throw new Error('Insumo de cotización no encontrado');

				await tx.insert(pedido_insumos).values({
					pedido_id: pedido.id,
					insumo_id: linea.insumo_id,
					cantidad: linea.cantidad,
					unidad: insumo.unidad,
					costo_unitario: linea.precio_unitario,
					cotizacion_linea_id: linea.id,
					observaciones: `Insumo agregado desde la cotización ${cotizacion.numero_cotizacion}`
				});
				continue;
			}

			await tx.insert(lineas_pedido).values({
				pedido_id: pedido.id,
				producto_id: linea.producto_id,
				es_personalizado: linea.es_personalizado,
				descripcion_personalizada: linea.es_personalizado ? linea.descripcion : null,
				cantidad: linea.cantidad,
				precio_unitario: redondearMoneda(linea.precio_unitario || 0),
				insumos_snapshot: linea.insumos_snapshot,
				orden_linea: linea.orden_linea
			});
		}

		await tx
			.update(cotizaciones)
			.set({ pedido_id: pedido.id, updated_at: now })
			.where(eq(cotizaciones.id, cotizacionId));
	});

	// Verificación de seguridad (por si la transacción falló silenciosamente)
	if (!pedidoId!) {
		throw new Error('Error al crear el pedido');
	}

	getCotizaciones({ search: '', page: 1 }).refresh();
	getCotizacionById(cotizacionId).refresh();

	return { pedidoId };
});

export const eliminarAdjunto = command(v.number(), async (adjuntoId) => {
	await requirePermission('cotizaciones', 'edit');
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	const [adjunto] = await db
		.select({ archivo_url: adjuntos_cotizacion.archivo_url })
		.from(adjuntos_cotizacion)
		.where(eq(adjuntos_cotizacion.id, adjuntoId))
		.limit(1);

	if (!adjunto) throw new Error('Adjunto no encontrado');

	await eliminarArchivoAdjunto(adjunto.archivo_url);
	await db.delete(adjuntos_cotizacion).where(eq(adjuntos_cotizacion.id, adjuntoId));

	return { success: true };
});

export const eliminarCotizacion = command(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'delete');
	const user = await getCurrentUser();
	if (!user) throw new Error('No autorizado');

	// Verificar que no tenga un pedido generado
	const [cotizacion] = await db
		.select()
		.from(cotizaciones)
		.where(eq(cotizaciones.id, cotizacionId))
		.limit(1);

	if (!cotizacion) throw new Error('Cotización no encontrada');

	if (cotizacion.pedido_id) {
		throw new Error('No se puede eliminar: tiene un pedido generado');
	}

	const adjuntos = await db
		.select({ archivo_url: adjuntos_cotizacion.archivo_url })
		.from(adjuntos_cotizacion)
		.where(eq(adjuntos_cotizacion.cotizacion_id, cotizacionId));

	await Promise.all(adjuntos.map((adjunto) => eliminarArchivoAdjunto(adjunto.archivo_url)));
	await db.delete(cotizaciones).where(eq(cotizaciones.id, cotizacionId));

	getCotizaciones({ search: '', page: 1 }).refresh();

	return { success: true };
});
