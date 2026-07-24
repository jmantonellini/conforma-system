import * as v from 'valibot';
import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import { roles, permisos, roles_permisos } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Schema
const RolSchema = v.object({
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	descripcion: v.optional(v.string())
});

const PermisoAsignacionSchema = v.object({
	rol_id: v.pipe(v.string(), v.transform(Number), v.number()),
	permisos: v.array(v.number())
});

// Queries
export const getRoles = query(async () => {
	return await db.select().from(roles).orderBy(roles.nombre);
});

export const getPermisos = query(async () => {
	return await db.select().from(permisos).orderBy(permisos.modulo, permisos.accion);
});

export const getPermisosByRol = query(v.number(), async (rol_id) => {
	return await db
		.select({
			id: roles_permisos.permiso_id,
			modulo: permisos.modulo,
			accion: permisos.accion
		})
		.from(roles_permisos)
		.leftJoin(permisos, eq(roles_permisos.permiso_id, permisos.id))
		.where(eq(roles_permisos.rol_id, rol_id));
});

// Commands
export const crearRol = command(RolSchema, async (data) => {
	const [rol] = await db.insert(roles).values(data).returning();
	return { success: true, rol };
});

export const actualizarRol = command(
	v.object({ id: v.number(), ...RolSchema.entries }),
	async (data) => {
		const { id, ...updateData } = data;
		const [rol] = await db.update(roles).set(updateData).where(eq(roles.id, id)).returning();
		return { success: true, rol };
	}
);

export const eliminarRol = command(v.object({ id: v.number() }), async ({ id }) => {
	await db.delete(roles).where(eq(roles.id, id));
	return { success: true };
});

export const asignarPermisos = command(PermisoAsignacionSchema, async (data) => {
	// Eliminar permisos existentes
	await db.delete(roles_permisos).where(eq(roles_permisos.rol_id, data.rol_id));

	// Insertar nuevos permisos
	if (data.permisos.length > 0) {
		await db.insert(roles_permisos).values(
			data.permisos.map((permiso_id) => ({
				rol_id: data.rol_id,
				permiso_id
			}))
		);
	}

	return { success: true };
});
