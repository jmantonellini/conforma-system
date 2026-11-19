import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, form, query, requested } from '$app/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contactos, cotizaciones, pedidos, transportistas } from '$lib/server/db/schema';
import { requirePermission, tienePermiso, usuarioDeSesion } from '$lib/server/auth/permissions';
import { registrarAuditoria } from '$lib/server/auditoria';
import { CamposEntregaSchema } from '$lib/modulos/ventas/entrega.schema';
import {
	ETIQUETA_MODALIDAD,
	ETIQUETA_TIPO_TRABAJO,
	RETIRA_EN_FABRICA,
	localidadCompleta,
	TIPOS_TRABAJO,
	tieneDatosEntrega,
	type DatosEntrega
} from '$lib/modulos/ventas/trabajo';
import { valoresEntrega } from './entrega.server';
import { getHistorialPedido, getPedidoById, getPedidos } from './pedidos.remote';

const describirEntrega = (entrega: DatosEntrega) =>
	tieneDatosEntrega(entrega)
		? [
				entrega.transportista,
				entrega.modalidad && ETIQUETA_MODALIDAD[entrega.modalidad],
				entrega.direccion,
				localidadCompleta(entrega),
				entrega.recibe && `Recibe ${entrega.recibe}`,
				entrega.telefono,
				entrega.consumidor_final && 'Declarar como consumidor final',
				entrega.indicaciones
			]
				.filter(Boolean)
				.join(' · ')
		: 'Datos de entrega quitados';

async function requierePermisoEntrega() {
	const user = await requirePermission('pedidos', 'view');
	if (
		!(await tienePermiso(user, 'pedidos', 'edit')) &&
		!(await tienePermiso(user, 'envios', 'edit'))
	)
		error(403, 'No tenés permiso para cambiar los datos de entrega');
	return user;
}

export const guardarEntregaPedido = form(
	v.object({
		pedido_id: v.pipe(v.string(), v.toNumber(), v.integer()),
		...CamposEntregaSchema,
		guardar_en_contacto: v.optional(v.boolean(), false)
	}),
	async ({ pedido_id, guardar_en_contacto, modalidad, ...campos }) => {
		const user = await requierePermisoEntrega();
		const entrega = { ...campos, modalidad: modalidad || null };
		const valores = valoresEntrega(entrega);

		await db.transaction(async (tx) => {
			const [pedido] = await tx
				.select({ contacto_id: pedidos.contacto_id })
				.from(pedidos)
				.where(eq(pedidos.id, pedido_id))
				.for('update');
			if (!pedido) error(404, 'Pedido no encontrado');
			await tx.update(pedidos).set(valores).where(eq(pedidos.id, pedido_id));
			if (guardar_en_contacto) {
				if (!(await tienePermiso(user, 'contactos', 'edit')))
					error(403, 'No tenés permiso para editar el contacto');
				await tx.update(contactos).set(valores).where(eq(contactos.id, pedido.contacto_id));
			}
			await registrarAuditoria(tx, {
				entidad: 'pedido',
				entidadId: pedido_id,
				usuarioId: user.id,
				accion: 'entrega',
				detalle: describirEntrega(entrega)
			});
		});

		getPedidoById(pedido_id).refresh();
		getHistorialPedido(pedido_id).refresh();
		requested(getPedidos, 1).refreshAll();
		return { success: true };
	}
);

export const cambiarTipoTrabajoPedido = command(
	v.object({ id: v.number(), tipo: v.picklist(TIPOS_TRABAJO) }),
	async ({ id, tipo }) => {
		const user = await requirePermission('pedidos', 'edit');
		await db.transaction(async (tx) => {
			const [actual] = await tx
				.select({ tipo: pedidos.tipo_trabajo })
				.from(pedidos)
				.where(eq(pedidos.id, id))
				.for('update');
			if (!actual) error(404, 'Pedido no encontrado');
			if (actual.tipo === tipo) return;
			await tx.update(pedidos).set({ tipo_trabajo: tipo }).where(eq(pedidos.id, id));
			await tx
				.update(cotizaciones)
				.set({ tipo_trabajo: tipo })
				.where(eq(cotizaciones.pedido_id, id));
			await registrarAuditoria(tx, {
				entidad: 'pedido',
				entidadId: id,
				usuarioId: user.id,
				accion: 'tipo_trabajo',
				detalle: `${ETIQUETA_TIPO_TRABAJO[actual.tipo]} → ${ETIQUETA_TIPO_TRABAJO[tipo]}`
			});
		});
		getPedidoById(id).refresh();
		getHistorialPedido(id).refresh();
		requested(getPedidos, 1).refreshAll();
		return { success: true };
	}
);

export const getNombresTransportistas = query(async () => {
	if (!(await usuarioDeSesion())) error(401, 'No autorizado');
	const filas = await db
		.select({ nombre: transportistas.nombre })
		.from(transportistas)
		.where(eq(transportistas.activo, true))
		.orderBy(asc(transportistas.nombre));
	const nombres = filas.map((fila) => fila.nombre);
	return nombres.some((nombre) => nombre.toLowerCase() === RETIRA_EN_FABRICA.toLowerCase())
		? nombres
		: [...nombres, RETIRA_EN_FABRICA];
});

export const agregarTransportista = command(
	v.pipe(v.string(), v.trim(), v.nonEmpty('Escribí el nombre del transportista'), v.maxLength(100)),
	async (nombre) => {
		const user = await usuarioDeSesion();
		if (!user) error(401, 'No autorizado');
		const permisos = await Promise.all([
			tienePermiso(user, 'contactos', 'edit'),
			tienePermiso(user, 'contactos', 'create'),
			tienePermiso(user, 'pedidos', 'edit'),
			tienePermiso(user, 'envios', 'edit')
		]);
		if (!permisos.some(Boolean)) error(403, 'No tenés permiso para agregar transportistas');
		if (nombre.toLowerCase() === RETIRA_EN_FABRICA.toLowerCase()) return RETIRA_EN_FABRICA;
		const [existente] = await db
			.select({ id: transportistas.id, nombre: transportistas.nombre })
			.from(transportistas)
			.where(sql`lower(${transportistas.nombre}) = lower(${nombre})`)
			.limit(1);
		if (existente) {
			await db
				.update(transportistas)
				.set({ activo: true })
				.where(eq(transportistas.id, existente.id));
		} else {
			await db.insert(transportistas).values({ nombre });
		}
		getNombresTransportistas().refresh();
		return existente?.nombre ?? nombre;
	}
);
