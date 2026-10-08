import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	lineas_cotizacion,
	adjuntos_cotizacion,
	notas_cotizacion,
	estados_cotizacion,
	usuarios,
	roles,
	permisos,
	roles_permisos,
	pedidos,
	lineas_pedido,
	pedido_insumos,
	estados_pedido,
	notificaciones,
	insumos
} from '$lib/server/db/schema';
import { and, desc, eq, or } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { getCurrentUser } from './usuarios.remote';
import { requirePermission } from '$lib/server/auth/permissions';
import { generarNumeroPedido } from '../server/utils/pedidos';
import { CotizacionSchema, LineaCotizacionSchema } from './cotizaciones.schema';
import {
	getCotizacionById,
	getCotizaciones,
	getHistorialCotizacion,
	getNotasCotizacion
} from './cotizaciones-consultas.remote';
import { getProductoConReceta } from './productos.remote';
import { obtenerPrecioProducto } from '$lib/server/services/productos.service';
import { calcularIva21, calcularPrecioConDescuento } from '$lib/utils/precios';
import { es } from '$lib/i18n/es';
import {
	aplicarCambioDeEstado,
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

async function notificarActualizacionCotizacion({
	cotizacionId,
	titulo,
	mensaje,
	permisoAdicional
}: {
	cotizacionId: number;
	titulo: string;
	mensaje: string;
	permisoAdicional?: { modulo: string; accion: string };
}) {
	const [cotizacion] = await db
		.select({
			creada_por: cotizaciones.creada_por,
			asignada_a: cotizaciones.asignada_a
		})
		.from(cotizaciones)
		.where(eq(cotizaciones.id, cotizacionId))
		.limit(1);
	if (!cotizacion) return;

	const condicionesDestinatario = [
		...(cotizacion.creada_por ? [eq(usuarios.id, cotizacion.creada_por)] : []),
		...(cotizacion.asignada_a ? [eq(usuarios.empleado_id, cotizacion.asignada_a)] : [])
	];
	const destinatarios = new Set<number>();

	if (condicionesDestinatario.length) {
		const usuariosResponsables = await db
			.select({ id: usuarios.id })
			.from(usuarios)
			.where(or(...condicionesDestinatario));
		for (const usuario of usuariosResponsables) destinatarios.add(usuario.id);
	}

	if (permisoAdicional) {
		const usuariosConPermiso = await db
			.select({ id: usuarios.id })
			.from(usuarios)
			.innerJoin(roles, eq(usuarios.rol_id, roles.id))
			.innerJoin(roles_permisos, eq(roles_permisos.rol_id, roles.id))
			.innerJoin(
				permisos,
				and(
					eq(permisos.id, roles_permisos.permiso_id),
					eq(permisos.modulo, permisoAdicional.modulo),
					eq(permisos.accion, permisoAdicional.accion)
				)
			)
			.where(eq(usuarios.activo, true));
		for (const usuario of usuariosConPermiso) destinatarios.add(usuario.id);
	}

	if (!destinatarios.size) return;
	await db.insert(notificaciones).values(
		Array.from(destinatarios, (usuario_id) => ({
			usuario_id,
			titulo,
			mensaje,
			link: `/cotizaciones/${cotizacionId}`
		}))
	);
}

async function notificarCambioEstadoCotizacion({
	cotizacionId,
	numeroCotizacion,
	clienteNombre,
	estadoDestino,
	comentario
}: {
	cotizacionId: number;
	numeroCotizacion: string;
	clienteNombre: string | null;
	estadoDestino?: { slug: string; nombre: string };
	comentario?: string;
}) {
	if (!estadoDestino) return;

	const esListaParaEnviar = estadoDestino.slug === 'lista_para_enviar';
	const esAprobada = estadoDestino.slug === 'aprobada';
	let titulo: string;
	let mensaje: string;
	if (esListaParaEnviar) {
		const plantilla = es.cotizaciones.notificaciones.listaParaEnviar;
		titulo = plantilla.titulo;
		mensaje = plantilla.mensaje(numeroCotizacion, clienteNombre ?? '');
	} else if (esAprobada) {
		const plantilla = es.cotizaciones.notificaciones.aprobada;
		titulo = plantilla.titulo;
		mensaje = plantilla.mensaje(numeroCotizacion);
	} else {
		const plantilla = es.cotizaciones.notificaciones.estadoActualizado;
		titulo = plantilla.titulo;
		mensaje = plantilla.mensaje(numeroCotizacion, estadoDestino.nombre);
	}
	const detalleComentario = comentario?.trim();

	await notificarActualizacionCotizacion({
		cotizacionId,
		titulo,
		mensaje: detalleComentario
			? `${mensaje}\n${es.cotizaciones.notificaciones.comentarioEstado(detalleComentario)}`
			: mensaje,
		permisoAdicional: esListaParaEnviar
			? { modulo: 'cotizaciones', accion: 'enviar' }
			: esAprobada
				? { modulo: 'cotizaciones', accion: 'convertir' }
				: undefined
	});
}

export const agregarNotaCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		contenido: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1, 'Escribí una nota antes de agregarla'),
			v.maxLength(5000, 'La nota no puede superar los 5000 caracteres')
		)
	}),
	async ({ cotizacion_id, contenido }) => {
		await requirePermission('cotizaciones', 'edit');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');

		const [cotizacion] = await db
			.select({ id: cotizaciones.id })
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id))
			.limit(1);
		if (!cotizacion) throw new Error('Cotización no encontrada');

		await db.insert(notas_cotizacion).values({
			cotizacion_id,
			usuario_id: user.id,
			contenido
		});
		const plantillaNota = es.cotizaciones.notificaciones.nuevaNota;
		await notificarActualizacionCotizacion({
			cotizacionId: cotizacion_id,
			titulo: plantillaNota.titulo,
			mensaje: plantillaNota.mensaje(user.username, contenido)
		});
		getNotasCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

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
	return { cotizacionId: cotizacion.id };
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
						comentario: es.cotizaciones.historial.asignada,
						createdAt: now
					});
				});
			}
		}

		const plantillaAsignada = es.cotizaciones.notificaciones.asignada;
		await notificarActualizacionCotizacion({
			cotizacionId: cotizacion_id,
			titulo: plantillaAsignada.titulo,
			mensaje: plantillaAsignada.mensaje(cotizacion.numero_cotizacion)
		});

		getCotizaciones({ search: '', page: 1 }).refresh();
		getCotizacionById(cotizacion_id).refresh();

		return { success: true };
	}
);

export const cotizarCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		validez_dias: v.pipe(v.number(), v.toMinValue(1)),
		precio_total: v.optional(v.pipe(v.number(), v.toMinValue(0))),
		incluir_iva: v.optional(v.boolean(), false),
		condiciones_pago: v.optional(v.pipe(v.string(), v.maxLength(1000))),
		lineas: v.pipe(v.array(LineaCotizacionSchema), v.minLength(1, 'Agregá al menos una línea'))
	}),
	async ({
		cotizacion_id,
		validez_dias,
		precio_total: precioTotalFinal,
		incluir_iva: incluirIva,
		condiciones_pago: condicionesPago,
		lineas
	}) => {
		await requirePermission('cotizaciones', 'cotizar');
		const user = await getCurrentUser();
		if (!user) throw new Error('No autorizado');
		const [cotizacionExistente] = await db
			.select({ pedido_id: cotizaciones.pedido_id })
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id))
			.limit(1);
		if (!cotizacionExistente) throw new Error('Cotización no encontrada');
		if (cotizacionExistente.pedido_id) {
			throw new Error('No se puede modificar una cotización convertida en pedido');
		}
		if (lineas.some((linea) => (linea.descuento_porcentaje ?? 0) > 0)) {
			await requirePermission('cotizaciones', 'descuento');
		}
		let precio_total = 0;

		await db.transaction(async (tx) => {
			await tx.delete(lineas_cotizacion).where(eq(lineas_cotizacion.cotizacion_id, cotizacion_id));

			for (const [i, linea] of lineas.entries()) {
				let descripcion = linea.descripcion;
				let costo_materiales = linea.costo_materiales || 0;
				let margen_porcentaje = 0;
				let precio_lista_unitario = Number(linea.precio_unitario || 0);
				let insumos_snapshot: unknown = null;

				if (linea.producto_id) {
					const [{ receta, recetaDirecta, componentes }, precioProducto] = await Promise.all([
						getProductoConReceta(Number(linea.producto_id)),
						obtenerPrecioProducto(Number(linea.producto_id))
					]);

					insumos_snapshot = recetaDirecta.map((lineaReceta) => {
						if (lineaReceta.insumo_id) {
							const material = receta.find((item) => item.insumo_id === lineaReceta.insumo_id);
							return {
								insumo_id: lineaReceta.insumo_id,
								codigo: material?.codigo ?? null,
								nombre: material?.nombre ?? 'Insumo',
								cantidad: lineaReceta.cantidad,
								costo_unitario: material?.costo_unitario ?? 0,
								unidad: material?.unidad ?? '',
								subtotal: (lineaReceta.cantidad || 0) * (material?.costo_unitario ?? 0)
							};
						}

						const nombre =
							componentes.find((componente) => componente.componente_id === lineaReceta.producto_id)
								?.nombre ?? 'Componente';
						return {
							producto_id: lineaReceta.producto_id ?? null,
							nombre: `${nombre} (${lineaReceta.cantidad}x)`,
							cantidad: lineaReceta.cantidad,
							unidad: 'subproducto',
							costo_unitario: 0,
							subtotal: 0
						};
					});
					costo_materiales = precioProducto.costo_materiales;
					margen_porcentaje = precioProducto.margen_porcentaje;
					precio_lista_unitario = redondearMoneda(
						linea.precio_lista_unitario ?? precioProducto.precio_venta
					);
					if (precio_lista_unitario < precioProducto.precio_venta) {
						throw new Error(
							'El precio de lista no puede ser menor al precio del producto; aplicá un descuento justificado'
						);
					}
				} else if (linea.insumo_id) {
					const [material] = await tx
						.select()
						.from(insumos)
						.where(eq(insumos.id, linea.insumo_id))
						.limit(1);
					if (!material) throw new Error('Insumo no encontrado');
					descripcion = material.nombre;
					costo_materiales = material.costo_unitario;
					precio_lista_unitario = redondearMoneda(
						linea.precio_lista_unitario ?? material.costo_unitario
					);
					if (precio_lista_unitario < redondearMoneda(material.costo_unitario)) {
						throw new Error(
							'El precio de lista del insumo no puede ser menor al costo; aplicá un descuento justificado'
						);
					}
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
				} else if (linea.precio_lista_unitario != null) {
					precio_lista_unitario = redondearMoneda(linea.precio_lista_unitario);
				}
				const descuento_porcentaje = Number(linea.descuento_porcentaje ?? 0);
				const justificacion_descuento =
					descuento_porcentaje > 0 ? linea.justificacion_descuento?.trim() || null : null;
				const precio_unitario = calcularPrecioConDescuento(
					precio_lista_unitario,
					descuento_porcentaje,
					justificacion_descuento ?? undefined
				);
				if (!linea.insumo_id) {
					precio_total = redondearMoneda(precio_total + linea.cantidad * precio_unitario);
				}

				await tx.insert(lineas_cotizacion).values({
					cotizacion_id,
					producto_id: linea.producto_id ?? null,
					insumo_id: linea.insumo_id ?? null,
					es_personalizado: linea.es_personalizado ?? !linea.producto_id,
					descripcion,
					cantidad: linea.cantidad,
					precio_unitario,
					precio_lista_unitario,
					margen_porcentaje,
					descuento_porcentaje,
					justificacion_descuento,
					descuento_usuario_id: descuento_porcentaje > 0 ? user.id : null,
					costo_mano_obra: redondearMoneda(linea.costo_mano_obra || 0),
					costo_materiales: redondearMoneda(costo_materiales || 0),
					insumos_snapshot,
					orden_linea: i
				});
			}

			const totalCalculado = redondearMoneda(
				precio_total + (incluirIva ? calcularIva21(precio_total) : 0)
			);
			await tx
				.update(cotizaciones)
				.set({
					precio_total: redondearMoneda(precioTotalFinal ?? totalCalculado),
					incluir_iva: incluirIva,
					condiciones_pago: condicionesPago?.trim() ?? null,
					validez_dias,
					updated_at: new Date()
				})
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
		const comentarioNormalizado = comentario?.trim() || null;
		if (estadoDestino?.slug === 'rechazada' && !comentarioNormalizado) {
			throw new Error('Indicá el motivo del rechazo');
		}

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
				comentario: comentarioNormalizado,
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
			estadoDestino: estadoDestino
				? { slug: estadoDestino.slug, nombre: estadoDestino.nombre }
				: undefined,
			comentario: comentarioNormalizado ?? undefined
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

	const precio_total =
		cotizacion.precio_total ??
		redondearMoneda(
			lineas
				.filter((linea) => !linea.insumo_id)
				.reduce((sum, linea) => sum + (linea.subtotal ?? 0), 0)
		);

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
					costo_unitario: linea.costo_materiales,
					precio_lista_unitario: linea.precio_lista_unitario,
					precio_unitario: linea.precio_unitario,
					descuento_porcentaje: linea.descuento_porcentaje,
					justificacion_descuento: linea.justificacion_descuento,
					descuento_usuario_id: linea.descuento_usuario_id,
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
				precio_lista_unitario: linea.precio_lista_unitario,
				margen_porcentaje: linea.margen_porcentaje,
				descuento_porcentaje: linea.descuento_porcentaje,
				justificacion_descuento: linea.justificacion_descuento,
				descuento_usuario_id: linea.descuento_usuario_id,
				costo_materiales: linea.costo_materiales,
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
