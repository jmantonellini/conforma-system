import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	lineas_cotizacion,
	adjuntos_cotizacion,
	estados_cotizacion,
	clientes,
	empleados,
	usuarios,
	roles,
	permisos,
	roles_permisos,
	pedidos,
	lineas_pedido,
	estados_pedido,
	productos,
	logs_cambios_estado,
	transiciones_estado,
	notificaciones
} from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { and, count, desc, eq, like, or, sql, aliasedTable } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { getCurrentUser } from './usuarios.remote';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { CotizacionSchema, LineaCotizacionSchema } from './cotizaciones.schema';

// ============================================================
// HELPERS INTERNOS
// ============================================================

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

async function getEstadoPorSlug(slug: string) {
	const [estado] = await db
		.select()
		.from(estados_cotizacion)
		.where(eq(estados_cotizacion.slug, slug))
		.limit(1);
	return estado;
}

/** Notifica a todos los usuarios activos que tienen un permiso dado. */
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

/** Notifica al usuario vinculado a un empleado (su usuario del sistema). */
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

// ============================================================
// QUERIES
// ============================================================

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

		const conditions = [];
		if (search) {
			const term = `%${search}%`;
			conditions.push(
				or(
					like(cotizaciones.numero_cotizacion, term),
					like(cotizaciones.cliente_nombre, term),
					like(clientes.nombre, term),
					like(clientes.apellido, term),
					like(clientes.razon_social, term)
				)
			);
		}
		if (estadoId) conditions.push(eq(cotizaciones.estado_id, estadoId));
		if (asignadaA) conditions.push(eq(cotizaciones.asignada_a, asignadaA));

		const where = conditions.length ? and(...conditions) : undefined;

		const data = await db
			.select({
				id: cotizaciones.id,
				numero_cotizacion: cotizaciones.numero_cotizacion,
				cliente_nombre: sql<string>`
					COALESCE(
						NULLIF(TRIM(CONCAT_WS(' ', ${clientes.nombre}, ${clientes.apellido})), ''),
						${clientes.razon_social},
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
			.leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
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
				id: clientes.id,
				nombre: clientes.nombre,
				apellido: clientes.apellido,
				razon_social: clientes.razon_social,
				telefono: clientes.telefono,
				email: clientes.email
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
		.leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
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
			producto_nombre: productos.nombre,
			es_personalizado: lineas_cotizacion.es_personalizado,
			descripcion: lineas_cotizacion.descripcion,
			cantidad: lineas_cotizacion.cantidad,
			precio_unitario: lineas_cotizacion.precio_unitario,
			subtotal: lineas_cotizacion.subtotal,
			costo_mano_obra: lineas_cotizacion.costo_mano_obra,
			costo_materiales: lineas_cotizacion.costo_materiales
		})
		.from(lineas_cotizacion)
		.leftJoin(productos, eq(lineas_cotizacion.producto_id, productos.id))
		.where(eq(lineas_cotizacion.cotizacion_id, id))
		.orderBy(lineas_cotizacion.orden_linea);

	const adjuntos = await db
		.select()
		.from(adjuntos_cotizacion)
		.where(eq(adjuntos_cotizacion.cotizacion_id, id))
		.orderBy(desc(adjuntos_cotizacion.id));

	return { cotizacion: { ...cotizacion, transiciones }, lineas, adjuntos };
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
	const user = await getCurrentUser();
	if (!user) throw new Error('Usuario no autenticado');

	const estadoInicial = await getEstadoPorSlug('ingresada');
	if (!estadoInicial) throw new Error('No existe el estado inicial "ingresada"');

	const [cotizacion] = await db
		.insert(cotizaciones)
		.values({
			numero_cotizacion: await generarNumeroCotizacion(),
			cliente_id: data.cliente_id && data.cliente_id > 0 ? data.cliente_id : null,
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

		// Si existe la transición ingresada -> asignada, la aplicamos automáticamente
		const estadoAsignada = await getEstadoPorSlug('asignada');
		if (estadoAsignada && estadoAsignada.id !== cotizacion.estado_id) {
			const transicion = await db
				.select()
				.from(transiciones_estado)
				.where(
					and(
						eq(transiciones_estado.tipo, 'cotizacion'),
						eq(transiciones_estado.estado_origen_id, cotizacion.estado_id),
						eq(transiciones_estado.estado_destino_id, estadoAsignada.id)
					)
				)
				.limit(1);

			if (transicion.length) {
				await db.transaction(async (tx) => {
					await tx
						.update(cotizaciones)
						.set({ estado_id: estadoAsignada.id, updated_at: now })
						.where(eq(cotizaciones.id, cotizacion_id));

					await tx.insert(logs_cambios_estado).values({
						entidad_tipo: 'cotizacion',
						entidad_id: cotizacion_id,
						usuario_id: user.id,
						estado_anterior_id: cotizacion.estado_id,
						estado_nuevo_id: estadoAsignada.id,
						comentario: 'Cotización asignada',
						created_at: now
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
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const precio_total = lineas.reduce(
			(sum, l) => sum + (l.cantidad || 0) * (l.precio_unitario || 0),
			0
		);

		await db.transaction(async (tx) => {
			await tx.delete(lineas_cotizacion).where(eq(lineas_cotizacion.cotizacion_id, cotizacion_id));

			for (const [i, linea] of lineas.entries()) {
				await tx.insert(lineas_cotizacion).values({
					cotizacion_id,
					producto_id: linea.producto_id ?? null,
					es_personalizado: linea.es_personalizado ?? !linea.producto_id,
					descripcion: linea.descripcion,
					cantidad: linea.cantidad,
					precio_unitario: linea.precio_unitario,
					costo_mano_obra: linea.costo_mano_obra || null,
					costo_materiales: linea.costo_materiales || null,
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
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const now = new Date();

		const [cotizacion] = await db
			.select()
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id))
			.limit(1);

		if (!cotizacion) throw new Error('Cotización no encontrada');

		const transicion = await db
			.select()
			.from(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'cotizacion'),
					eq(transiciones_estado.estado_origen_id, cotizacion.estado_id),
					eq(transiciones_estado.estado_destino_id, estado_destino_id)
				)
			)
			.limit(1);

		if (!transicion.length) throw new Error('Transición no permitida');

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

			await tx.update(cotizaciones).set(updates).where(eq(cotizaciones.id, cotizacion_id));

			await tx.insert(logs_cambios_estado).values({
				entidad_tipo: 'cotizacion',
				entidad_id: cotizacion_id,
				usuario_id: user.id,
				estado_anterior_id: cotizacion.estado_id,
				estado_nuevo_id: estado_destino_id,
				comentario: comentario ?? null,
				created_at: now
			});
		});

		// Notificaciones según el destino
		if (estadoDestino?.slug === 'lista_para_enviar') {
			await notificarUsuariosConPermiso(
				'cotizaciones',
				'enviar',
				'Cotización lista para enviar',
				`La cotización ${cotizacion.numero_cotizacion} (${cotizacion.cliente_nombre}) está lista para enviar al cliente.`,
				`/cotizaciones/${cotizacion_id}`
			);
		}

		if (estadoDestino?.slug === 'aprobada') {
			await notificarUsuariosConPermiso(
				'cotizaciones',
				'convertir',
				'Cotización aprobada',
				`El cliente aprobó la cotización ${cotizacion.numero_cotizacion}. Ya podés generar el pedido.`,
				`/cotizaciones/${cotizacion_id}`
			);
		}

		getCotizaciones({ search: '', page: 1 }).refresh();
		getCotizacionById(cotizacion_id).refresh();
		getHistorialCotizacion(cotizacion_id).refresh();

		return { success: true };
	}
);

export const convertirCotizacionAPedido = command(v.number(), async (cotizacionId) => {
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

	if (!cotizacion.cliente_id) {
		throw new Error('La cotización debe tener un cliente vinculado para generar el pedido');
	}
	const clienteId = cotizacion.cliente_id;

	const estadoAprobada = await getEstadoPorSlug('aprobada');
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

	const precio_total = lineas.reduce((sum, l) => sum + (l.subtotal ?? 0), 0);

	// Variable para guardar el ID del pedido creado
	let pedidoId: number;

	await db.transaction(async (tx) => {
		const [pedido] = await tx
			.insert(pedidos)
			.values({
				numero_pedido: await generarNumeroPedido(),
				cliente_id: clienteId,
				fecha_pedido: now,
				estado_id: estadoPendiente?.id ?? 1,
				precio_total,
				saldo_pendiente: precio_total,
				observaciones: `Generado desde cotización ${cotizacion.numero_cotizacion}.${cotizacion.observaciones ? ' ' + cotizacion.observaciones : ''}`
			})
			.returning();

		pedidoId = pedido.id; // Asignar dentro de la transacción

		for (const linea of lineas) {
			await tx.insert(lineas_pedido).values({
				pedido_id: pedido.id,
				producto_id: linea.producto_id,
				es_personalizado: linea.es_personalizado,
				descripcion_personalizada: linea.es_personalizado ? linea.descripcion : null,
				cantidad: linea.cantidad,
				precio_unitario: linea.precio_unitario,
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
