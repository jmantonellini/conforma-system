import { command, form, getRequestEvent, query } from '$app/server';
import { getDb } from '$lib/server/db';
import { empleados, roles, sesiones, usuarios } from '$lib/server/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { ActualizarUsuarioSchema, CrearUsuarioSchema } from './usuarios.schema';
import { getEmpleados } from './empleados.remote';

export const getCurrentUser = query(async () => {
	const event = getRequestEvent();

	const sessionId = event.cookies.get('session');

	if (!sessionId) return null;

	const db = getDb(event.platform?.env?.DB);

	const session = await db.select().from(sesiones).where(eq(sesiones.id, sessionId)).get();

	if (!session || session.user_id == null || new Date(session.expires_at) < new Date()) {
		return null;
	}

	const user = await db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			rol: {
				id: roles.id,
				nombre: roles.nombre,
				descripcion: roles.descripcion
			}
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.where(eq(usuarios.id, session.user_id))
		.get();

	if (!user) return null;

	return user;
});

export const getUsuarios = query(async () => {
	const event = getRequestEvent();
	const db = getDb(event.platform?.env?.DB);
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
				nombre: empleados.nombre
			}
		})
		.from(usuarios)
		.leftJoin(roles, eq(roles.id, usuarios.rol_id))
		.leftJoin(empleados, eq(empleados.id, usuarios.empleado_id));
});

export const deleteUsuario = command(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	await db.delete(usuarios).where(eq(usuarios.id, id));
	getUsuarios().refresh();
	return { success: true };
});

export const crearUsuario = form(CrearUsuarioSchema, async (data) => {
	console.log('DATA', data);

	const db = getDb(getRequestEvent().platform?.env?.DB);

	const [usuario] = await db
		.insert(usuarios)
		.values({
			username: data.username,
			password_hash: bcrypt.hashSync(data.password_hash, 10),
			empleado_id: data.empleado_id,
			rol_id: data.rol_id
		})
		.returning();
	console.log('USUARIO', usuario);

	getUsuarios().refresh();

	return { success: true, usuario };
});

export const actualizarUsuario = form(ActualizarUsuarioSchema, async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	const { id, ...updateData } = data;

	if (data.password_hash) {
		updateData.password_hash = bcrypt.hashSync(data.password_hash, 10);
	}

	const values = {
		username: updateData.username,
		empleado_id: updateData.empleado_id ?? null,
		rol_id: updateData.rol_id ?? null,
		...(updateData.password_hash && { password_hash: updateData.password_hash })
	};

	const usuario = await db.update(usuarios).set(values).where(eq(usuarios.id, id)).returning();

	getUsuarios().refresh();
	getEmpleados().refresh();

	return { success: true, usuario };
});
