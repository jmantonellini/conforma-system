import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	contactos,
	lineas_cotizacion,
	notas_cotizacion,
	usuarios,
	permisos,
	roles_permisos,
	pedidos,
	lineas_pedido,
	pedido_insumos,
	notificaciones,
	insumos
} from '$lib/server/db/schema';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { calcularIva21, precioNetoCubreCosto, redondearPrecio } from '$lib/utils/precios';
import { requirePermission, usuarioDeSesion } from '$lib/server/auth/permissions';
import { clavesAdjuntos, eliminarArchivos } from '$lib/server/services/adjuntos.service';
import { resolverLineaComercial } from '$lib/server/services/lineas-comerciales.service';
import {
	estadoPorSlug,
	registrarCambioEstado,
	transicionPermitida,
	validarTransicion,
	type Tx
} from '$lib/server/estados';
import { siguienteNumero } from '$lib/server/utils/numeracion';
import { CotizacionSchema, LineaCotizacionSchema } from './cotizaciones.schema';
import {
	getCotizacionById,
	getCotizaciones,
	getHistorialCotizacion,
	getNotasCotizacion
} from './cotizaciones-consultas.remote';
import { getInsumos } from './insumos.remote';
import { es } from '$lib/i18n/es';

const avisos = es.cotizaciones.notificaciones;

/** Bloquea la cotización dentro de la transacción para serializar cambios concurrentes. */
async function bloquearCotizacion(tx: Tx, id: number) {
	const [cotizacion] = await tx
		.select()
		.from(cotizaciones)
		.where(eq(cotizaciones.id, id))
		.for('update')
		.limit(1);
	if (!cotizacion) error(404, 'Cotización no encontrada');
	return cotizacion;
}

function refrescarCotizacion(id?: number) {
	getCotizaciones({ search: '', page: 1 }).refresh();
	if (id) getCotizacionById(id).refresh();
}

/** Notifica a quien creó y a quien tiene asignada la cotización (y opcionalmente a un permiso). */
async function notificar(
	cotizacionId: number,
	titulo: string,
	mensaje: string,
	permisoAdicional?: { modulo: string; accion: string }
) {
	const [cotizacion] = await db
		.select({ creada_por: cotizaciones.creada_por, asignada_a: cotizaciones.asignada_a })
		.from(cotizaciones)
		.where(eq(cotizaciones.id, cotizacionId))
		.limit(1);
	if (!cotizacion) return;

	const responsables = [
		cotizacion.creada_por ? eq(usuarios.id, cotizacion.creada_por) : undefined,
		cotizacion.asignada_a ? eq(usuarios.empleado_id, cotizacion.asignada_a) : undefined
	].filter((condicion) => condicion !== undefined);

	const [porResponsabilidad, porPermiso] = await Promise.all([
		responsables.length
			? db
					.select({ id: usuarios.id })
					.from(usuarios)
					.where(or(...responsables))
			: [],
		permisoAdicional
			? db
					.select({ id: usuarios.id })
					.from(usuarios)
					.innerJoin(roles_permisos, eq(roles_permisos.rol_id, usuarios.rol_id))
					.innerJoin(
						permisos,
						and(
							eq(permisos.id, roles_permisos.permiso_id),
							eq(permisos.modulo, permisoAdicional.modulo),
							eq(permisos.accion, permisoAdicional.accion)
						)
					)
					.where(eq(usuarios.activo, true))
			: []
	]);

	const destinatarios = new Set(
		[...porResponsabilidad, ...porPermiso].map((usuario) => usuario.id)
	);
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

function avisoCambioEstado(
	estado: { slug: string; nombre: string },
	numero: string,
	cliente: string | null
) {
	if (estado.slug === 'lista_para_enviar') {
		return {
			titulo: avisos.listaParaEnviar.titulo,
			mensaje: avisos.listaParaEnviar.mensaje(numero, cliente ?? ''),
			permiso: { modulo: 'cotizaciones', accion: 'enviar' }
		};
	}
	if (estado.slug === 'aprobada') {
		return {
			titulo: avisos.aprobada.titulo,
			mensaje: avisos.aprobada.mensaje(numero),
			permiso: { modulo: 'cotizaciones', accion: 'convertir' }
		};
	}
	return {
		titulo: avisos.estadoActualizado.titulo,
		mensaje: avisos.estadoActualizado.mensaje(numero, estado.nombre)
	};
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
		const user = await requirePermission('cotizaciones', 'edit');
		const [cotizacion] = await db
			.select({ id: cotizaciones.id })
			.from(cotizaciones)
			.where(eq(cotizaciones.id, cotizacion_id));
		if (!cotizacion) error(404, 'Cotización no encontrada');
		await db.insert(notas_cotizacion).values({ cotizacion_id, usuario_id: user.id, contenido });

		await notificar(
			cotizacion_id,
			avisos.nuevaNota.titulo,
			avisos.nuevaNota.mensaje(user.username, contenido)
		);
		getNotasCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

// ============================================================
// NOTIFICACIONES
// ============================================================

export const getNotificaciones = query(async () => {
	const user = await usuarioDeSesion();
	if (!user) return [];
	return db
		.select()
		.from(notificaciones)
		.where(eq(notificaciones.usuario_id, user.id))
		.orderBy(desc(notificaciones.created_at))
		.limit(50);
});

export const marcarNotificacionesLeidas = command(async () => {
	const user = await usuarioDeSesion();
	if (!user) error(401, 'No autorizado');
	await db
		.update(notificaciones)
		.set({ leida: true })
		.where(and(eq(notificaciones.usuario_id, user.id), eq(notificaciones.leida, false)));
	getNotificaciones().refresh();
	return { success: true };
});

// ============================================================
// ALTA Y EDICIÓN
// ============================================================

export const crearCotizacion = form(CotizacionSchema, async (data) => {
	const user = await requirePermission('cotizaciones', 'create');
	const estadoInicial = await estadoPorSlug('cotizacion', 'ingresada');

	const cotizacion = await db.transaction(async (tx) => {
		const [creada] = await tx
			.insert(cotizaciones)
			.values({
				numero_cotizacion: await siguienteNumero(tx, cotizaciones.numero_cotizacion, 'C'),
				contacto_id: data.contacto_id,
				contacto_distribuidor_id: data.contacto_distribuidor_id || null,
				canal: data.canal,
				descripcion: data.descripcion,
				observaciones: data.observaciones || null,
				estado_id: estadoInicial.id,
				creada_por: user.id
			})
			.returning({ id: cotizaciones.id });
		return creada;
	});

	refrescarCotizacion();
	return { cotizacionId: cotizacion.id };
});

export const asignarCotizacion = command(
	v.object({ cotizacion_id: v.number(), empleado_id: v.number() }),
	async ({ cotizacion_id, empleado_id }) => {
		const user = await requirePermission('cotizaciones', 'asignar');
		const asignada = await estadoPorSlug('cotizacion', 'asignada');

		const numero = await db.transaction(async (tx) => {
			const cotizacion = await bloquearCotizacion(tx, cotizacion_id);
			const avanza =
				cotizacion.estado_id !== asignada.id &&
				(await transicionPermitida(tx, cotizacion.estado_id, asignada.id));

			await tx
				.update(cotizaciones)
				.set({ asignada_a: empleado_id, ...(avanza && { estado_id: asignada.id }) })
				.where(eq(cotizaciones.id, cotizacion_id));
			if (avanza) {
				await registrarCambioEstado(tx, {
					flujo: 'cotizacion',
					entidadId: cotizacion_id,
					usuarioId: user.id,
					anteriorId: cotizacion.estado_id,
					nuevoId: asignada.id,
					comentario: es.cotizaciones.historial.asignada
				});
			}
			return cotizacion.numero_cotizacion;
		});

		await notificar(cotizacion_id, avisos.asignada.titulo, avisos.asignada.mensaje(numero));
		refrescarCotizacion(cotizacion_id);
		getHistorialCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

export const cotizarCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		validez_dias: v.pipe(v.number(), v.toMinValue(1)),
		precio_total: v.optional(v.pipe(v.number(), v.toMinValue(0))),
		descuento_global_porcentaje: v.optional(
			v.pipe(v.number(), v.minValue(0), v.maxValue(99.99)),
			0
		),
		incluir_iva: v.optional(v.boolean(), false),
		condiciones_pago: v.optional(v.pipe(v.string(), v.maxLength(1000))),
		lineas: v.pipe(v.array(LineaCotizacionSchema), v.minLength(1, 'Agregá al menos una línea'))
	}),
	async ({ cotizacion_id, lineas, ...totales }) => {
		await requirePermission('cotizaciones', 'cotizar');
		await requirePermission('importes', 'view');
		if (totales.descuento_global_porcentaje > 0) {
			await requirePermission('cotizaciones', 'descuento');
		}
		const creaInsumos = lineas.some((linea) => linea.nuevo_insumo);
		if (creaInsumos) await requirePermission('insumos', 'create');

		await db.transaction(async (tx) => {
			const cotizacion = await bloquearCotizacion(tx, cotizacion_id);
			if (cotizacion.pedido_id) {
				error(409, 'No se puede modificar una cotización convertida en pedido');
			}

			const filas = [];
			for (const [orden_linea, linea] of lineas.entries()) {
				const resuelta = await resolverLineaComercial(
					tx,
					{
						...linea,
						tipo: linea.producto_id
							? 'producto'
							: linea.insumo_id || linea.nuevo_insumo
								? 'insumo'
								: 'concepto'
					},
					'COT'
				);
				const costo = redondearPrecio(resuelta.costo_materiales);
				const precio = resuelta.precio_unitario;
				filas.push({
					cotizacion_id,
					producto_id: resuelta.producto_id,
					insumo_id: resuelta.insumo_id,
					es_personalizado: resuelta.es_personalizado,
					visible_cliente: resuelta.visible_cliente,
					descripcion: resuelta.descripcion,
					cantidad: linea.cantidad,
					precio_unitario: precio,
					precio_lista_unitario: resuelta.precio_lista_unitario,
					margen_porcentaje:
						resuelta.visible_cliente && precio > 0
							? redondearPrecio(((precio - costo) / precio) * 100)
							: 0,
					costo_materiales: costo,
					insumos_snapshot: resuelta.insumos_snapshot,
					orden_linea
				});
			}

			const subtotal = redondearPrecio(
				filas
					.filter((fila) => fila.visible_cliente)
					.reduce((suma, fila) => suma + fila.cantidad * fila.precio_unitario, 0)
			);
			const costoTotal = redondearPrecio(
				filas.reduce((suma, fila) => suma + fila.cantidad * fila.costo_materiales, 0)
			);
			const base = redondearPrecio(subtotal * (1 - totales.descuento_global_porcentaje / 100));
			const precioTotal = redondearPrecio(
				totales.precio_total ?? base + (totales.incluir_iva ? calcularIva21(base) : 0)
			);
			const neto = totales.incluir_iva ? redondearPrecio(precioTotal / 1.21) : precioTotal;
			if (!precioNetoCubreCosto(neto, costoTotal)) {
				error(400, 'El neto de la cotización no cubre el costo total de los materiales');
			}

			await tx.delete(lineas_cotizacion).where(eq(lineas_cotizacion.cotizacion_id, cotizacion_id));
			await tx.insert(lineas_cotizacion).values(filas);
			await tx
				.update(cotizaciones)
				.set({
					precio_total: precioTotal,
					descuento_global_porcentaje: totales.descuento_global_porcentaje,
					incluir_iva: totales.incluir_iva,
					condiciones_pago: totales.condiciones_pago?.trim() || null,
					validez_dias: totales.validez_dias
				})
				.where(eq(cotizaciones.id, cotizacion_id));
		});

		if (creaInsumos) getInsumos({}).refresh();
		getCotizacionById(cotizacion_id).refresh();
		return { success: true };
	}
);

// ============================================================
// MÁQUINA DE ESTADOS
// ============================================================

export const cambiarEstadoCotizacion = command(
	v.object({
		cotizacion_id: v.number(),
		estado_destino_id: v.number(),
		comentario: v.optional(v.pipe(v.string(), v.trim()))
	}),
	async ({ cotizacion_id, estado_destino_id, comentario }) => {
		const user = await requirePermission('cotizaciones', 'edit');

		const { cotizacion, destino } = await db.transaction(async (tx) => {
			const cotizacion = await bloquearCotizacion(tx, cotizacion_id);
			if (cotizacion.pedido_id) {
				error(409, 'No se puede modificar una cotización que ya generó un pedido');
			}
			const destino = await validarTransicion(tx, cotizacion.estado_id, estado_destino_id);
			if (destino.slug === 'rechazada' && !comentario) error(400, 'Indicá el motivo del rechazo');

			const ahora = new Date();
			await tx
				.update(cotizaciones)
				.set({ estado_id: destino.id, ...(destino.slug === 'enviada' && { fecha_envio: ahora }) })
				.where(eq(cotizaciones.id, cotizacion_id));
			await registrarCambioEstado(tx, {
				flujo: 'cotizacion',
				entidadId: cotizacion_id,
				usuarioId: user.id,
				anteriorId: cotizacion.estado_id,
				nuevoId: destino.id,
				comentario,
				fecha: ahora
			});
			return { cotizacion, destino };
		});

		const [cliente] = await db
			.select({ nombre: contactos.razon_social })
			.from(contactos)
			.where(eq(contactos.id, cotizacion.contacto_id));
		const aviso = avisoCambioEstado(destino, cotizacion.numero_cotizacion, cliente?.nombre ?? null);
		await notificar(
			cotizacion_id,
			aviso.titulo,
			comentario ? `${aviso.mensaje}\n${avisos.comentarioEstado(comentario)}` : aviso.mensaje,
			aviso.permiso
		);

		refrescarCotizacion(cotizacion_id);
		getHistorialCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

export const convertirCotizacionAPedido = command(v.number(), async (cotizacionId) => {
	const user = await requirePermission('cotizaciones', 'convertir');
	const [aprobada, pendiente] = await Promise.all([
		estadoPorSlug('cotizacion', 'aprobada'),
		estadoPorSlug('pedido', 'pendiente')
	]);

	const pedidoId = await db.transaction(async (tx) => {
		const cotizacion = await bloquearCotizacion(tx, cotizacionId);
		if (cotizacion.pedido_id) error(409, 'Esta cotización ya tiene un pedido generado');
		if (cotizacion.estado_id !== aprobada.id) {
			error(409, 'La cotización debe estar Aprobada para generar el pedido');
		}

		const lineas = await tx
			.select({ linea: lineas_cotizacion, unidad_insumo: insumos.unidad })
			.from(lineas_cotizacion)
			.leftJoin(insumos, eq(lineas_cotizacion.insumo_id, insumos.id))
			.where(eq(lineas_cotizacion.cotizacion_id, cotizacionId))
			.orderBy(lineas_cotizacion.orden_linea);
		const productivas = lineas.filter(({ linea }) => linea.visible_cliente && !linea.insumo_id);
		const deInsumos = lineas.filter(({ linea }) => linea.insumo_id && !linea.producto_id);
		if (!productivas.length) error(400, 'La cotización no tiene líneas visibles para producir');

		const precioTotal =
			cotizacion.precio_total ??
			redondearPrecio(productivas.reduce((suma, { linea }) => suma + (linea.subtotal ?? 0), 0));
		const [pedido] = await tx
			.insert(pedidos)
			.values({
				numero_pedido: await siguienteNumero(tx, pedidos.numero_pedido, 'P'),
				contacto_id: cotizacion.contacto_id,
				contacto_distribuidor_id: cotizacion.contacto_distribuidor_id,
				fecha_pedido: new Date(),
				estado_id: pendiente.id,
				precio_total: precioTotal,
				saldo_pendiente: precioTotal,
				observaciones: [
					`Generado desde cotización ${cotizacion.numero_cotizacion}.`,
					cotizacion.observaciones
				]
					.filter(Boolean)
					.join(' ')
			})
			.returning({ id: pedidos.id });

		await tx.insert(lineas_pedido).values(
			productivas.map(({ linea }) => ({
				pedido_id: pedido.id,
				producto_id: linea.producto_id,
				es_personalizado: linea.es_personalizado,
				descripcion_personalizada: linea.es_personalizado ? linea.descripcion : null,
				cantidad: linea.cantidad,
				precio_unitario: redondearPrecio(linea.precio_unitario),
				precio_lista_unitario: linea.precio_lista_unitario,
				margen_porcentaje: linea.margen_porcentaje,
				costo_materiales: linea.costo_materiales,
				insumos_snapshot: linea.insumos_snapshot,
				orden_linea: linea.orden_linea
			}))
		);
		if (deInsumos.length) {
			await tx.insert(pedido_insumos).values(
				deInsumos.map(({ linea, unidad_insumo }) => ({
					pedido_id: pedido.id,
					insumo_id: linea.insumo_id!,
					cantidad: linea.cantidad,
					unidad: unidad_insumo ?? 'unidad',
					costo_unitario: linea.costo_materiales,
					precio_lista_unitario: linea.precio_lista_unitario,
					precio_unitario: linea.precio_unitario,
					cotizacion_linea_id: linea.id,
					observaciones: `Insumo agregado desde la cotización ${cotizacion.numero_cotizacion}`
				}))
			);
		}

		await tx
			.update(cotizaciones)
			.set({ pedido_id: pedido.id })
			.where(eq(cotizaciones.id, cotizacionId));
		await registrarCambioEstado(tx, {
			flujo: 'pedido',
			entidadId: pedido.id,
			usuarioId: user.id,
			anteriorId: null,
			nuevoId: pendiente.id,
			comentario: `Pedido generado desde la cotización ${cotizacion.numero_cotizacion}`
		});
		return pedido.id;
	});

	refrescarCotizacion(cotizacionId);
	return { pedidoId };
});

export const eliminarCotizacion = command(v.number(), async (cotizacionId) => {
	await requirePermission('cotizaciones', 'delete');
	const claves = await clavesAdjuntos('cotizacion', cotizacionId);

	const [eliminada] = await db
		.delete(cotizaciones)
		.where(and(eq(cotizaciones.id, cotizacionId), isNull(cotizaciones.pedido_id)))
		.returning({ id: cotizaciones.id });
	if (!eliminada) error(409, 'No se puede eliminar: no existe o ya tiene un pedido generado');

	await eliminarArchivos(claves);
	refrescarCotizacion();
	return { success: true };
});
