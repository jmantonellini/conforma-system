import { and, eq, inArray, lt, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { Ejecutor } from '$lib/server/estados';
import {
	MODULOS_NOTIFICACION,
	cotizaciones,
	lineas_pedido,
	notificaciones,
	ordenes_fabricacion,
	pedidos,
	permisos,
	roles_permisos,
	usuarios
} from '$lib/server/db/schema';

export type ModuloNotificacion = (typeof MODULOS_NOTIFICACION)[number];
export type PermisoDestino = { modulo: string; accion: string };

type Id = number | null | undefined;

export type Destinatarios = {
	usuarios?: Id[];
	empleados?: Id[];
	permisos?: PermisoDestino[];
};

export type Aviso = {
	modulo: ModuloNotificacion;
	titulo: string;
	mensaje?: string | null;
	link: string;
};

const ids = (valores: Id[] = []) => valores.filter((valor): valor is number => !!valor);

export function combinar(...grupos: Destinatarios[]): Destinatarios {
	return {
		usuarios: grupos.flatMap((g) => g.usuarios ?? []),
		empleados: grupos.flatMap((g) => g.empleados ?? []),
		permisos: grupos.flatMap((g) => g.permisos ?? [])
	};
}

async function resolver(ejecutor: Ejecutor, destinatarios: Destinatarios) {
	const resultado = new Set(ids(destinatarios.usuarios));
	const empleados = ids(destinatarios.empleados);
	if (empleados.length) {
		const filas = await ejecutor
			.select({ id: usuarios.id })
			.from(usuarios)
			.where(and(inArray(usuarios.empleado_id, empleados), eq(usuarios.activo, true)));
		for (const { id } of filas) resultado.add(id);
	}
	for (const permiso of destinatarios.permisos ?? []) {
		const filas = await ejecutor
			.select({ id: usuarios.id })
			.from(usuarios)
			.innerJoin(roles_permisos, eq(roles_permisos.rol_id, usuarios.rol_id))
			.innerJoin(
				permisos,
				and(
					eq(permisos.id, roles_permisos.permiso_id),
					eq(permisos.modulo, permiso.modulo),
					eq(permisos.accion, permiso.accion)
				)
			)
			.where(eq(usuarios.activo, true));
		for (const { id } of filas) resultado.add(id);
	}
	return resultado;
}

export async function notificar(
	destinatarios: Destinatarios,
	aviso: Aviso,
	{ actor, ejecutor = db }: { actor?: number; ejecutor?: Ejecutor } = {}
) {
	const usuariosDestino = await resolver(ejecutor, destinatarios);
	if (actor) usuariosDestino.delete(actor);
	if (!usuariosDestino.size) return;
	await ejecutor.insert(notificaciones).values(
		Array.from(usuariosDestino, (usuario_id) => ({
			usuario_id,
			modulo: aviso.modulo,
			titulo: aviso.titulo,
			mensaje: aviso.mensaje ?? null,
			link: aviso.link
		}))
	);
}

export async function participantesCotizacion(
	cotizacionId: number,
	ejecutor: Ejecutor = db
): Promise<Destinatarios> {
	const [cotizacion] = await ejecutor
		.select({ creada_por: cotizaciones.creada_por, asignada_a: cotizaciones.asignada_a })
		.from(cotizaciones)
		.where(eq(cotizaciones.id, cotizacionId));
	return { usuarios: [cotizacion?.creada_por], empleados: [cotizacion?.asignada_a] };
}

export async function participantesPedido(
	pedidoId: number,
	ejecutor: Ejecutor = db
): Promise<Destinatarios> {
	const [pedido] = await ejecutor
		.select({ creado_por: pedidos.creado_por })
		.from(pedidos)
		.where(eq(pedidos.id, pedidoId));
	const origen = await ejecutor
		.select({ creada_por: cotizaciones.creada_por, asignada_a: cotizaciones.asignada_a })
		.from(cotizaciones)
		.where(eq(cotizaciones.pedido_id, pedidoId));
	return {
		usuarios: [pedido?.creado_por, ...origen.map((c) => c.creada_por)],
		empleados: origen.map((c) => c.asignada_a)
	};
}

export async function participantesOrden(
	ordenId: number,
	ejecutor: Ejecutor = db
): Promise<Destinatarios & { pedidoId: number | null }> {
	const [orden] = await ejecutor
		.select({ asignado_a: ordenes_fabricacion.asignado_a, pedido_id: lineas_pedido.pedido_id })
		.from(ordenes_fabricacion)
		.leftJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
		.where(eq(ordenes_fabricacion.id, ordenId));
	const delPedido = orden?.pedido_id ? await participantesPedido(orden.pedido_id, ejecutor) : {};
	return {
		...combinar({ empleados: [orden?.asignado_a] }, delPedido),
		pedidoId: orden?.pedido_id ?? null
	};
}

const DIA = 86_400_000;

export async function purgarNotificaciones({
	diasLeidas = 30,
	diasMaximo = 90
}: { diasLeidas?: number; diasMaximo?: number } = {}) {
	const ahora = Date.now();
	const borradas = await db
		.delete(notificaciones)
		.where(
			or(
				and(
					eq(notificaciones.leida, true),
					lt(notificaciones.created_at, new Date(ahora - diasLeidas * DIA))
				),
				lt(notificaciones.created_at, new Date(ahora - diasMaximo * DIA))
			)
		)
		.returning({ id: notificaciones.id });
	return borradas.length;
}

export function programarLimpiezaNotificaciones() {
	const limpiar = () =>
		purgarNotificaciones().catch((error) =>
			console.error('[notificaciones] No se pudo limpiar', error)
		);
	void limpiar();
	setInterval(limpiar, DIA).unref();
}
