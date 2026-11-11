import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import { empleados, roles, usuarios } from '$lib/server/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { ActualizarUsuarioSchema, CrearUsuarioSchema } from './usuarios.schema';
import { getEmpleados } from './empleados.remote';
import { requirePermission, usuarioDeSesion } from '$lib/server/auth/permissions';

export const getCurrentUser = query(usuarioDeSesion);

export const getUsuarios = query(async () => {
	await requirePermission('configuracion', 'view');
	return await db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			rol: {
				id: roles.id,
				nombre: roles.nombre
			},
			empleado: {
				id: usuarios.empleado_id,
				nombre: empleados.nombre,
				apellido: empleados.apellido
			},
			empleado_id: usuarios.empleado_id
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.leftJoin(empleados, eq(empleados.id, usuarios.empleado_id));
});

export const deleteUsuario = command(v.number(), async (id) => {
	await requirePermission('configuracion', 'edit');
	await db.delete(usuarios).where(eq(usuarios.id, id));
	getUsuarios().refresh();
	return { success: true };
});

export const crearUsuario = form(CrearUsuarioSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const [usuario] = await db
		.insert(usuarios)
		.values({
			username: data.username,
			password_hash: bcrypt.hashSync(data.password_hash, 10),
			empleado_id: data.empleado_id || null,
			rol_id: data.rol_id || null
		})
		.returning();

	getUsuarios().refresh();

	return { success: true, usuario };
});

export const actualizarUsuario = form(ActualizarUsuarioSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const { id, ...updateData } = data;

	if (data.password_hash) {
		updateData.password_hash = bcrypt.hashSync(data.password_hash, 10);
	}

	const values = {
		username: updateData.username,
		empleado_id: updateData.empleado_id || null,
		rol_id: updateData.rol_id || null,
		...(updateData.password_hash && { password_hash: updateData.password_hash })
	};

	const usuario = await db.update(usuarios).set(values).where(eq(usuarios.id, id)).returning();

	getUsuarios().refresh();
	getEmpleados().refresh();

	return { success: true, usuario };
});
