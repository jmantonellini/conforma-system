import { error } from '@sveltejs/kit';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import * as v from 'valibot';
import { command, query } from '$app/server';
import { db } from '$lib/server/db';
import { permisos, roles, roles_permisos, usuarios } from '$lib/server/db/schema';
import { requirePermission, usuarioDeSesion } from '$lib/server/auth/permissions';
import { PERMISOS_ESTANDAR, ROL_ADMINISTRADOR } from './permisos';

const clave = (modulo: string, accion: string) => `${modulo}.${accion}`;
const ESTANDAR = new Set(PERMISOS_ESTANDAR.map((p) => clave(p.modulo, p.accion)));

const DatosRolSchema = v.object({
	nombre: v.pipe(v.string(), v.trim(), v.nonEmpty('Poné un nombre'), v.maxLength(60)),
	descripcion: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200)))
});

export const getRoles = query(async () => {
	await requirePermission('configuracion', 'view');
	const [lista, usos] = await Promise.all([
		db.select().from(roles).orderBy(asc(roles.nombre)),
		db
			.select({ rol_id: usuarios.rol_id, usuarios: count() })
			.from(usuarios)
			.groupBy(usuarios.rol_id)
	]);
	const porRol = new Map(usos.map((u) => [u.rol_id, u.usuarios]));
	return lista.map((rol) => ({
		...rol,
		usuarios: porRol.get(rol.id) ?? 0,
		esAdministrador: rol.nombre === ROL_ADMINISTRADOR
	}));
});

export type RolListado = Awaited<ReturnType<typeof getRoles>>[number];

export const getPermisosByRol = query(v.number(), async (rolId) => {
	const usuario = await usuarioDeSesion();
	if (!usuario) error(401, 'Sesión vencida');
	if (usuario.rol?.id !== rolId) await requirePermission('configuracion', 'view');
	return db
		.select({ id: permisos.id, modulo: permisos.modulo, accion: permisos.accion })
		.from(roles_permisos)
		.innerJoin(permisos, eq(roles_permisos.permiso_id, permisos.id))
		.where(eq(roles_permisos.rol_id, rolId));
});

async function rolEditable(rolId: number) {
	const [rol] = await db.select().from(roles).where(eq(roles.id, rolId));
	if (!rol) error(404, 'Rol no encontrado');
	if (rol.nombre === ROL_ADMINISTRADOR) error(400, 'El rol admin siempre tiene acceso total');
	return rol;
}

async function nombreLibre(nombre: string, excepto?: number) {
	const [existente] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(and(eq(roles.nombre, nombre), excepto ? ne(roles.id, excepto) : undefined));
	if (existente) error(400, 'Ya existe un rol con ese nombre');
}

export const guardarPermisosRol = command(
	v.object({
		rol_id: v.number(),
		permisos: v.array(v.object({ modulo: v.string(), accion: v.string() }))
	}),
	async ({ rol_id, permisos: elegidos }) => {
		await requirePermission('configuracion', 'edit');
		await rolEditable(rol_id);

		const claves = new Set(elegidos.map((p) => clave(p.modulo, p.accion)));
		for (const p of elegidos) claves.add(clave(p.modulo, 'view'));
		const validas = [...claves].filter((c) => ESTANDAR.has(c));

		const catalogo = await db.select().from(permisos);
		const ids = catalogo
			.filter((p) => validas.includes(clave(p.modulo, p.accion)))
			.map((p) => p.id);

		await db.transaction(async (tx) => {
			await tx.delete(roles_permisos).where(eq(roles_permisos.rol_id, rol_id));
			if (ids.length) {
				await tx.insert(roles_permisos).values(ids.map((permiso_id) => ({ rol_id, permiso_id })));
			}
		});
		getPermisosByRol(rol_id).refresh();
		getRoles().refresh();
	}
);

export const crearRol = command(DatosRolSchema, async ({ nombre, descripcion }) => {
	await requirePermission('configuracion', 'edit');
	await nombreLibre(nombre);
	const [rol] = await db
		.insert(roles)
		.values({ nombre, descripcion: descripcion || null })
		.returning({ id: roles.id });
	getRoles().refresh();
	return rol;
});

export const actualizarRol = command(
	v.object({ id: v.number(), ...DatosRolSchema.entries }),
	async ({ id, nombre, descripcion }) => {
		await requirePermission('configuracion', 'edit');
		await rolEditable(id);
		await nombreLibre(nombre, id);
		await db
			.update(roles)
			.set({ nombre, descripcion: descripcion || null })
			.where(eq(roles.id, id));
		getRoles().refresh();
	}
);

export const eliminarRol = command(v.number(), async (id) => {
	await requirePermission('configuracion', 'edit');
	await rolEditable(id);
	const [{ total }] = await db
		.select({ total: count() })
		.from(usuarios)
		.where(eq(usuarios.rol_id, id));
	if (total) error(400, 'Reasigná los usuarios de este rol antes de eliminarlo');
	await db.delete(roles).where(eq(roles.id, id));
	getRoles().refresh();
});
