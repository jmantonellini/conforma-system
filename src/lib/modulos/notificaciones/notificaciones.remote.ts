import { error } from '@sveltejs/kit';
import { and, count, desc, eq, gte, or } from 'drizzle-orm';
import * as v from 'valibot';
import { command, query, requested } from '$app/server';
import { db } from '$lib/server/db';
import { notificaciones } from '$lib/server/db/schema';
import { usuarioDeSesion } from '$lib/server/auth/permissions';

async function usuarioActual() {
	const usuario = await usuarioDeSesion();
	if (!usuario) error(401, 'Sesión vencida');
	return usuario;
}

const columnas = {
	id: notificaciones.id,
	modulo: notificaciones.modulo,
	titulo: notificaciones.titulo,
	mensaje: notificaciones.mensaje,
	link: notificaciones.link,
	leida: notificaciones.leida,
	created_at: notificaciones.created_at
};

const DIAS_EN_CAMPANA = 7;
const POR_PAGINA = 25;

export const getNotificaciones = query(async () => {
	const usuario = await usuarioDeSesion();
	if (!usuario) return [];
	const desde = new Date(Date.now() - DIAS_EN_CAMPANA * 86_400_000);
	return db
		.select(columnas)
		.from(notificaciones)
		.where(
			and(
				eq(notificaciones.usuario_id, usuario.id),
				or(eq(notificaciones.leida, false), gte(notificaciones.created_at, desde))
			)
		)
		.orderBy(desc(notificaciones.created_at))
		.limit(50);
});

export const getHistorialNotificaciones = query(
	v.object({ pagina: v.optional(v.number(), 1), soloSinLeer: v.optional(v.boolean(), false) }),
	async ({ pagina, soloSinLeer }) => {
		const usuario = await usuarioActual();
		const filtro = and(
			eq(notificaciones.usuario_id, usuario.id),
			soloSinLeer ? eq(notificaciones.leida, false) : undefined
		);
		const [items, [{ total }]] = await Promise.all([
			db
				.select(columnas)
				.from(notificaciones)
				.where(filtro)
				.orderBy(desc(notificaciones.created_at))
				.limit(POR_PAGINA)
				.offset((pagina - 1) * POR_PAGINA),
			db.select({ total: count() }).from(notificaciones).where(filtro)
		]);
		return { items, total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
	}
);

export const marcarNotificacionLeida = command(v.number(), async (id) => {
	const usuario = await usuarioActual();
	await db
		.update(notificaciones)
		.set({ leida: true })
		.where(and(eq(notificaciones.id, id), eq(notificaciones.usuario_id, usuario.id)));
	getNotificaciones().refresh();
	requested(getHistorialNotificaciones, 5).refreshAll();
});

export const marcarNotificacionesLeidas = command(async () => {
	const usuario = await usuarioActual();
	await db
		.update(notificaciones)
		.set({ leida: true })
		.where(and(eq(notificaciones.usuario_id, usuario.id), eq(notificaciones.leida, false)));
	getNotificaciones().refresh();
	requested(getHistorialNotificaciones, 5).refreshAll();
});
