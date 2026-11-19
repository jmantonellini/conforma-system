import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { form, query } from '$app/server';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { cotizaciones, pedidos, recepciones_pieza } from '$lib/server/db/schema';
import { tienePermiso, usuarioDeSesion } from '$lib/server/auth/permissions';
import { registrarAuditoria } from '$lib/server/auditoria';
import { fechaDesdeInput } from '$lib/utils/fechas';
import { parsearNumeroDecimal, redondearPrecio } from '$lib/utils/precios';
import { buscarRecepcion } from './recepciones.server';
import { aplicarFleteRecepcion } from './flete.server';
import {
	getCotizacionById,
	getHistorialCotizacion
} from '$lib/modulos/cotizaciones/cotizaciones-consultas.remote';
import { getHistorialPedido, getPedidoById } from '$lib/modulos/pedidos/pedidos.remote';

const idOpcional = v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))));

async function usuarioConPermiso(permisos: [string, string][]) {
	const user = await usuarioDeSesion();
	if (!user) error(401, 'No autorizado');
	for (const [modulo, accion] of permisos) {
		if (await tienePermiso(user, modulo, accion)) return user;
	}
	error(403, 'No tenés permiso para realizar esta acción');
}

export const getRecepcion = query(
	v.object({ cotizacionId: idOpcional, pedidoId: idOpcional }),
	async (dueno) => {
		const user = await usuarioConPermiso([
			['cotizaciones', 'view'],
			['pedidos', 'view'],
			['fabricacion', 'view']
		]);
		const recepcion = await buscarRecepcion(dueno);
		if (!recepcion || (await tienePermiso(user, 'importes', 'view'))) return recepcion;
		return { ...recepcion, flete_pagado: null };
	}
);

function leerPesos(texto: string) {
	const limpio = texto.replace(/[$\s]/g, '');
	if (!limpio) return null;
	const sinMiles = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio) ? limpio.replace(/\./g, '') : limpio;
	const numero = parsearNumeroDecimal(sinMiles);
	return numero !== null && numero >= 0 ? redondearPrecio(numero) : undefined;
}

const textoOpcional = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300)), '');

export const guardarRecepcion = form(
	v.object({
		tipo: v.picklist(['cotizacion', 'pedido']),
		entidad_id: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
		recepcion_id: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1))),
		fecha_recepcion: v.pipe(v.string(), v.isoDate('Indicá la fecha en que llegó')),
		llego_por: textoOpcional,
		numero_guia: textoOpcional,
		estado_pieza: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Describí cómo llegó la pieza: golpes, roturas, faltantes'),
			v.maxLength(2000)
		),
		flete_pagado: v.optional(
			v.pipe(
				v.string(),
				v.transform(leerPesos),
				v.check((valor) => valor !== undefined, 'Escribí el flete en pesos, por ejemplo 15000'),
				v.transform((valor) => valor ?? null)
			),
			''
		)
	}),
	async ({
		tipo,
		entidad_id,
		recepcion_id,
		fecha_recepcion,
		llego_por,
		numero_guia,
		estado_pieza,
		flete_pagado
	}) => {
		const user =
			tipo === 'cotizacion'
				? await usuarioConPermiso([
						['cotizaciones', 'edit'],
						['cotizaciones', 'create']
					])
				: await usuarioConPermiso([['pedidos', 'edit']]);
		const tabla = tipo === 'cotizacion' ? cotizaciones : pedidos;
		const columna =
			tipo === 'cotizacion' ? recepciones_pieza.cotizacion_id : recepciones_pieza.pedido_id;
		const cargaFlete = await tienePermiso(user, 'importes', 'view');
		const valores = {
			fecha_recepcion: fechaDesdeInput(fecha_recepcion),
			llego_por: llego_por || null,
			numero_guia: numero_guia || null,
			estado_pieza,
			...(cargaFlete && { flete_pagado: flete_pagado || null })
		};

		let flete = null as Awaited<ReturnType<typeof aplicarFleteRecepcion>>;
		await db.transaction(async (tx) => {
			const [entidad] = await tx
				.select({ id: tabla.id })
				.from(tabla)
				.where(eq(tabla.id, entidad_id))
				.for('update');
			if (!entidad)
				error(404, tipo === 'cotizacion' ? 'Cotización no encontrada' : 'Pedido no encontrado');

			let fleteAnterior: number | null = null;
			if (recepcion_id) {
				const [previa] = await tx
					.select({ flete: recepciones_pieza.flete_pagado })
					.from(recepciones_pieza)
					.where(eq(recepciones_pieza.id, recepcion_id))
					.for('update');
				if (!previa) error(404, 'Recepción no encontrada');
				fleteAnterior = previa.flete;
				await tx
					.update(recepciones_pieza)
					.set(valores)
					.where(eq(recepciones_pieza.id, recepcion_id));
			} else {
				const [existente] = await tx
					.select({ id: recepciones_pieza.id })
					.from(recepciones_pieza)
					.where(eq(columna, entidad_id));
				if (existente) error(409, 'La pieza ya tiene una recepción registrada');
				await tx.insert(recepciones_pieza).values({
					...valores,
					[columna.name]: entidad_id,
					recibido_por: user.id
				});
			}

			const fleteNuevo = cargaFlete ? (flete_pagado ?? 0) : (fleteAnterior ?? 0);
			if ((fleteAnterior ?? 0) !== fleteNuevo) {
				flete = await aplicarFleteRecepcion(tx, { tipo, id: entidad_id }, fleteNuevo || null);
				if (flete) {
					const permiso =
						flete.documento.tipo === 'pedido'
							? await tienePermiso(user, 'pedidos', 'edit')
							: (await tienePermiso(user, 'cotizaciones', 'edit')) ||
								(await tienePermiso(user, 'cotizaciones', 'create'));
					if (!permiso) error(403, 'No tenés permiso para sumar el flete al trabajo');
					await registrarAuditoria(tx, {
						entidad: flete.documento.tipo,
						entidadId: flete.documento.id,
						usuarioId: user.id,
						accion: 'recepcion',
						detalle: flete.detalle
					});
				}
			}

			await registrarAuditoria(tx, {
				entidad: tipo,
				entidadId: entidad_id,
				usuarioId: user.id,
				accion: 'recepcion',
				detalle: [
					llego_por && `Llegó por ${llego_por}`,
					numero_guia && `guía ${numero_guia}`,
					estado_pieza
				]
					.filter(Boolean)
					.join(' · ')
			});
		});
		if (tipo === 'cotizacion') getHistorialCotizacion(entidad_id).refresh();
		else getHistorialPedido(entidad_id).refresh();
		if (flete?.documento.tipo === 'pedido') {
			getPedidoById(flete.documento.id).refresh();
			getHistorialPedido(flete.documento.id).refresh();
		} else if (flete) getCotizacionById(flete.documento.id).refresh();
		return { success: true, flete: flete?.aviso ?? null };
	}
);
