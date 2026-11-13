import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form } from '$app/server';
import { db } from '$lib/server/db';
import {
	cotizaciones,
	contactos,
	lineas_cotizacion,
	notas_cotizacion,
	pedidos,
	lineas_pedido,
	pedido_insumos,
	insumos,
	unidadInsumo
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { calcularIva21, precioNetoCubreCosto, redondearPrecio } from '$lib/utils/precios';
import { requirePermission, tienePermiso } from '$lib/server/auth/permissions';
import { clavesAdjuntos, eliminarArchivos } from '$lib/modulos/adjuntos/adjuntos.server';
import { resolverLineaComercial } from '$lib/modulos/ventas/lineas.server';
import { cambiarMonedaTx, dolarBNA } from '$lib/modulos/ventas/moneda.server';
import { CambioMonedaSchema } from '$lib/modulos/ventas/moneda.schema';
import { factorDesdeUsd } from '$lib/utils/moneda';
import {
	estadoPorSlug,
	registrarCambioEstado,
	transicionPermitida,
	validarTransicion,
	type Tx
} from '$lib/server/estados';
import { siguienteNumero } from '$lib/server/db/numeracion';
import { CotizacionSchema, LineaCotizacionSchema } from './cotizaciones.schema';
import {
	getCotizacionById,
	getCotizaciones,
	getHistorialCotizacion,
	getNotasCotizacion
} from './cotizaciones-consultas.remote';
import { getInsumos } from '../insumos/insumos.remote';
import { es } from '$lib/modulos/cotizaciones/textos';
import {
	combinar,
	notificar,
	participantesCotizacion,
	type PermisoDestino
} from '$lib/modulos/notificaciones/notificaciones.server';
import { avisarPedidoNuevo } from '$lib/modulos/pedidos/avisos.server';

const avisos = es.cotizaciones.notificaciones;

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

async function notificarCotizacion(
	cotizacionId: number,
	aviso: { titulo: string; mensaje: string; permiso?: PermisoDestino },
	actor: number
) {
	await notificar(
		combinar(await participantesCotizacion(cotizacionId), {
			permisos: aviso.permiso ? [aviso.permiso] : []
		}),
		{
			modulo: 'cotizacion',
			titulo: aviso.titulo,
			mensaje: aviso.mensaje,
			link: `/cotizaciones/${cotizacionId}`
		},
		{ actor }
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
			permiso: { modulo: 'cotizaciones', accion: 'edit' }
		};
	}
	if (estado.slug === 'aprobada') {
		return {
			titulo: avisos.aprobada.titulo,
			mensaje: avisos.aprobada.mensaje(numero),
			permiso: { modulo: 'pedidos', accion: 'create' }
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

		await notificarCotizacion(
			cotizacion_id,
			{
				titulo: avisos.nuevaNota.titulo,
				mensaje: avisos.nuevaNota.mensaje(user.username, contenido)
			},
			user.id
		);
		getNotasCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

export const crearCotizacion = form(CotizacionSchema, async (data) => {
	const user = await requirePermission('cotizaciones', 'create');
	const asignadaA = data.asignada_a || null;
	if (asignadaA && !(await tienePermiso(user, 'cotizaciones', 'edit'))) {
		error(403, 'No tenés permiso para asignar cotizaciones');
	}
	const [ingresada, asignada, dolar] = await Promise.all([
		estadoPorSlug('cotizacion', 'ingresada'),
		estadoPorSlug('cotizacion', 'asignada'),
		dolarBNA()
	]);

	const cotizacion = await db.transaction(async (tx) => {
		const avanza = !!asignadaA && (await transicionPermitida(tx, ingresada.id, asignada.id));
		const [creada] = await tx
			.insert(cotizaciones)
			.values({
				numero_cotizacion: await siguienteNumero(tx, cotizaciones.numero_cotizacion, 'C'),
				contacto_id: data.contacto_id,
				contacto_distribuidor_id: data.contacto_distribuidor_id || null,
				canal: data.canal,
				descripcion: data.descripcion,
				observaciones: data.observaciones || null,
				asignada_a: asignadaA,
				estado_id: avanza ? asignada.id : ingresada.id,
				tipo_cambio: dolar?.venta ?? null,
				creada_por: user.id
			})
			.returning({ id: cotizaciones.id, numero: cotizaciones.numero_cotizacion });
		if (avanza) {
			await registrarCambioEstado(tx, {
				flujo: 'cotizacion',
				entidadId: creada.id,
				usuarioId: user.id,
				anteriorId: ingresada.id,
				nuevoId: asignada.id,
				comentario: es.cotizaciones.historial.asignada
			});
		}
		return creada;
	});

	if (asignadaA) {
		await notificarCotizacion(
			cotizacion.id,
			{ titulo: avisos.asignada.titulo, mensaje: avisos.asignada.mensaje(cotizacion.numero) },
			user.id
		);
	}
	refrescarCotizacion();
	return { cotizacionId: cotizacion.id };
});

export const asignarCotizacion = command(
	v.object({ cotizacion_id: v.number(), empleado_id: v.number() }),
	async ({ cotizacion_id, empleado_id }) => {
		const user = await requirePermission('cotizaciones', 'edit');
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

		await notificarCotizacion(
			cotizacion_id,
			{ titulo: avisos.asignada.titulo, mensaje: avisos.asignada.mensaje(numero) },
			user.id
		);
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
		await requirePermission('cotizaciones', 'edit');
		await requirePermission('importes', 'view');
		const creaInsumos = lineas.some((linea) => linea.nuevo_insumo);
		if (creaInsumos) await requirePermission('insumos', 'create');

		await db.transaction(async (tx) => {
			const cotizacion = await bloquearCotizacion(tx, cotizacion_id);
			if (cotizacion.pedido_id) {
				error(409, 'No se puede modificar una cotización convertida en pedido');
			}
			const factor = factorDesdeUsd(cotizacion);

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
					'COT',
					factor
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
		await notificarCotizacion(
			cotizacion_id,
			{
				...aviso,
				mensaje: comentario
					? `${aviso.mensaje}\n${avisos.comentarioEstado(comentario)}`
					: aviso.mensaje
			},
			user.id
		);

		refrescarCotizacion(cotizacion_id);
		getHistorialCotizacion(cotizacion_id).refresh();
		return { success: true };
	}
);

export const convertirCotizacionAPedido = command(v.number(), async (cotizacionId) => {
	const user = await requirePermission('pedidos', 'create');
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
			.select({ linea: lineas_cotizacion, unidad_insumo: unidadInsumo })
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
				moneda: cotizacion.moneda,
				tipo_cambio: cotizacion.tipo_cambio,
				creado_por: user.id,
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

	await avisarPedidoNuevo(pedidoId, user.id);
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

export const cambiarMonedaCotizacion = command(CambioMonedaSchema, async (cambio) => {
	const user = await requirePermission('cotizaciones', 'edit');
	await requirePermission('importes', 'view');
	await db.transaction((tx) =>
		cambiarMonedaTx(tx, { ...cambio, documento: 'cotizacion' }, user.id)
	);
	refrescarCotizacion(cambio.id);
	getHistorialCotizacion(cambio.id).refresh();
	return { success: true };
});
