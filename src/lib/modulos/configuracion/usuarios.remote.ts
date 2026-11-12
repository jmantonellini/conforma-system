import { error } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { and, asc, eq, isNull, ne, or } from 'drizzle-orm';
import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import { empleados, roles, usuarios } from '$lib/server/db/schema';
import { requirePermission, usuarioDeSesion } from '$lib/server/auth/permissions';
import { getEmpleados, getEmpleadosSinUsuario } from './empleados.remote';
import { ActualizarUsuarioSchema, CrearUsuarioSchema } from './usuarios.schema';

export const getCurrentUser = query(usuarioDeSesion);

export const getUsuarios = query(async () => {
	await requirePermission('configuracion', 'view');
	return db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			activo: usuarios.activo,
			ultimo_acceso: usuarios.ultimo_acceso,
			rol: { id: roles.id, nombre: roles.nombre },
			empleado: { id: empleados.id, nombre: empleados.nombre, apellido: empleados.apellido }
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.leftJoin(empleados, eq(empleados.id, usuarios.empleado_id))
		.orderBy(asc(usuarios.username));
});

export type UsuarioListado = Awaited<ReturnType<typeof getUsuarios>>[number];

async function asegurarEmpleadoLibre(empleadoId: number | null, usuarioId?: number) {
	if (!empleadoId) return;
	const [ocupado] = await db
		.select({ username: usuarios.username })
		.from(usuarios)
		.where(
			and(eq(usuarios.empleado_id, empleadoId), usuarioId ? ne(usuarios.id, usuarioId) : undefined)
		);
	if (ocupado) error(400, `Ese empleado ya está vinculado al usuario ${ocupado.username}`);
}

async function asegurarUsernameLibre(username: string, usuarioId?: number) {
	const [existente] = await db
		.select({ id: usuarios.id })
		.from(usuarios)
		.where(
			and(eq(usuarios.username, username), usuarioId ? ne(usuarios.id, usuarioId) : undefined)
		);
	if (existente) error(400, 'Ese nombre de usuario ya existe');
}

function refrescar() {
	getUsuarios().refresh();
	getEmpleados().refresh();
	getEmpleadosSinUsuario().refresh();
	getUsuariosSinEmpleado().refresh();
}

export const crearUsuario = form(CrearUsuarioSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const empleadoId = data.empleado_id || null;
	await Promise.all([asegurarUsernameLibre(data.username), asegurarEmpleadoLibre(empleadoId)]);
	await db.insert(usuarios).values({
		username: data.username,
		password_hash: bcrypt.hashSync(data.password_hash, 10),
		empleado_id: empleadoId,
		rol_id: data.rol_id || null
	});
	refrescar();
});

export const actualizarUsuario = form(ActualizarUsuarioSchema, async ({ id, ...data }) => {
	await requirePermission('configuracion', 'edit');
	const empleadoId = data.empleado_id || null;
	await Promise.all([
		asegurarUsernameLibre(data.username, id),
		asegurarEmpleadoLibre(empleadoId, id)
	]);
	await db
		.update(usuarios)
		.set({
			username: data.username,
			empleado_id: empleadoId,
			rol_id: data.rol_id || null,
			...(data.password_hash && { password_hash: bcrypt.hashSync(data.password_hash, 10) })
		})
		.where(eq(usuarios.id, id));
	refrescar();
});

export const deleteUsuario = command(v.number(), async (id) => {
	const actual = await requirePermission('configuracion', 'edit');
	if (actual.id === id) error(400, 'No podés eliminar tu propio usuario');
	await db.delete(usuarios).where(eq(usuarios.id, id));
	refrescar();
});

export const getUsuariosSinEmpleado = query(async () => {
	await requirePermission('configuracion', 'view');
	return db
		.select({ id: usuarios.id, username: usuarios.username })
		.from(usuarios)
		.where(isNull(usuarios.empleado_id))
		.orderBy(asc(usuarios.username));
});

export const vincularUsuarioEmpleado = command(
	v.object({ empleado_id: v.number(), usuario_id: v.nullable(v.number()) }),
	async ({ empleado_id, usuario_id }) => {
		await requirePermission('configuracion', 'edit');
		await db.transaction(async (tx) => {
			await tx
				.update(usuarios)
				.set({ empleado_id: null })
				.where(
					or(
						eq(usuarios.empleado_id, empleado_id),
						usuario_id ? eq(usuarios.id, usuario_id) : undefined
					)
				);
			if (usuario_id) {
				await tx.update(usuarios).set({ empleado_id }).where(eq(usuarios.id, usuario_id));
			}
		});
		refrescar();
	}
);
