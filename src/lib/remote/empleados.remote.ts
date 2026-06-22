import * as v from 'valibot';
import { query, form, command, getRequestEvent } from '$app/server';
import { getDb } from '$lib/server/db';
import { empleados, roles, usuarios } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { EmpleadoSchema } from './empleados.schema';

// Schema de validación

// Query: obtener todos los empleados (con datos completos para listado)
export const getEmpleados = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db
		.select({
			id: empleados.id,
			nombre: empleados.nombre,
			apellido: empleados.apellido,
			email: empleados.email,
			telefono: empleados.telefono,
			dni: empleados.dni,
			direccion: empleados.direccion,
			fecha_ingreso: empleados.fecha_ingreso,
			activo: empleados.activo
		})
		.from(empleados)
		.where(eq(empleados.activo, true))
		.orderBy(empleados.apellido);
});

// Query: obtener un empleado por ID
export const getEmpleadoById = query(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const empleado = await db.select().from(empleados).where(eq(empleados.id, id)).get();

		if (!empleado) throw new Error('Empleado no encontrado');
		return empleado;
	}
);

// Query: obtener empleados sin usuario (para el select en usuarios)
export const getEmpleadosSinUsuario = query(async () => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	return await db
		.select({
			id: empleados.id,
			nombre: empleados.nombre,
			apellido: empleados.apellido
		})
		.from(empleados)
		.leftJoin(usuarios, eq(empleados.id, usuarios.empleado_id))
		.where(isNull(usuarios.empleado_id));
});

// Form: crear empleado
export const crearEmpleado = form(EmpleadoSchema, async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const [empleado] = await db
		.insert(empleados)
		.values({
			nombre: data.nombre,
			apellido: data.apellido,
			email: data.email || null,
			telefono: data.telefono || null,
			dni: data.dni || null,
			direccion: data.direccion || null,
			fecha_ingreso: data.fecha_ingreso ? new Date(data.fecha_ingreso) : null
		})
		.returning();

	getEmpleados().refresh();
	return { success: true, empleado };
});

// Form: actualizar empleado
export const actualizarEmpleado = form(
	v.object({
		id: v.pipe(v.string(), v.transform(Number), v.number()),
		...EmpleadoSchema.entries
	}),
	async (data) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		const { id, ...updateData } = data;

		const [empleado] = await db
			.update(empleados)
			.set({
				nombre: updateData.nombre,
				apellido: updateData.apellido,
				email: updateData.email || null,
				telefono: updateData.telefono || null,
				dni: updateData.dni || null,
				direccion: updateData.direccion || null,
				fecha_ingreso: updateData.fecha_ingreso ? new Date(updateData.fecha_ingreso) : null
			})
			.where(eq(empleados.id, id))
			.returning();

		getEmpleados().refresh();
		return { success: true, empleado };
	}
);

// Command: eliminar empleado (desactivar)
export const eliminarEmpleado = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);
		await db.update(empleados).set({ activo: false }).where(eq(empleados.id, id));

		getEmpleados().refresh();
		return { success: true };
	}
);
