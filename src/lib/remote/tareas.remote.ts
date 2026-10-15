import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { tareas, empleados } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { EstadosTarea, Prioridades } from '$lib/types';
import { TareaSchema } from './tareas.schema';

export const getTareas = query(async (includeArchivadas = false) => {
	let queryBuilder = db
		.select({
			id: tareas.id,
			titulo: tareas.titulo,
			descripcion: tareas.descripcion,
			estado: tareas.estado,
			archivada: tareas.archivada,
			prioridad: tareas.prioridad,
			fecha_entrega: tareas.fecha_entrega,
			asignado_a: tareas.asignado_a,
			orden: tareas.orden,
			created_at: tareas.created_at,
			updated_at: tareas.updated_at,
			empleado: {
				id: empleados.id,
				nombre: empleados.nombre,
				apellido: empleados.apellido
			}
		})
		.from(tareas)
		.leftJoin(empleados, eq(tareas.asignado_a, empleados.id));

	if (!includeArchivadas) {
		queryBuilder = queryBuilder.where(eq(tareas.archivada, false)) as typeof queryBuilder;
	}

	const tareasConEmpleado = await queryBuilder.orderBy(asc(tareas.orden));

	return tareasConEmpleado;
});

export const crearTarea = form(TareaSchema, async (data) => {
	const user = await getCurrentUser();

	if (!user) throw new Error('No autorizado');

	const [ultimoOrden] = await db
		.select({ orden: tareas.orden })
		.from(tareas)
		.orderBy(desc(tareas.orden))
		.limit(1);

	const nuevoOrden = (ultimoOrden?.orden ?? -1) + 1;

	const [tarea] = await db
		.insert(tareas)
		.values({
			titulo: data.titulo ?? '',
			descripcion: data.descripcion ?? null,
			estado: data.estado ?? EstadosTarea.PENDIENTE,
			prioridad: data.prioridad ?? Prioridades.MEDIA,
			fecha_entrega: data.fecha_entrega ? new Date(data.fecha_entrega) : null,
			asignado_a: data.asignado_a ?? null,
			archivada: false,
			orden: nuevoOrden
		})
		.returning();

	getTareas().refresh();

	return { success: true, tarea };
});

export const actualizarTarea = command(
	v.object({
		id: v.pipe(v.string(), v.transform(Number), v.number()),
		titulo: v.optional(v.pipe(v.string(), v.nonEmpty('El título es requerido'))),
		descripcion: v.optional(v.string()),
		estado: v.optional(v.enum(EstadosTarea)),
		prioridad: v.optional(v.enum(Prioridades)),
		fecha_entrega: v.optional(v.string()),
		asignado_a: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
		archivada: v.optional(v.boolean())
	}),
	async (data) => {
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		const updates = {
			...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
			...(data.descripcion !== undefined ? { descripcion: data.descripcion || null } : {}),
			...(data.estado !== undefined ? { estado: data.estado } : {}),
			...(data.prioridad !== undefined ? { prioridad: data.prioridad } : {}),
			...(data.fecha_entrega !== undefined
				? { fecha_entrega: data.fecha_entrega ? new Date(data.fecha_entrega) : null }
				: {}),
			...(data.asignado_a !== undefined ? { asignado_a: data.asignado_a || null } : {}),
			...(data.archivada !== undefined ? { archivada: data.archivada } : {}),
			updated_at: new Date()
		};

		await db.update(tareas).set(updates).where(eq(tareas.id, data.id));

		getTareas().refresh();

		return { success: true };
	}
);

export const archivarTarea = command(
	v.object({
		id: v.pipe(v.string(), v.transform(Number), v.number()),
		archivada: v.optional(v.boolean(), true)
	}),
	async (data) => {
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		await db
			.update(tareas)
			.set({ archivada: data.archivada, updated_at: new Date() })
			.where(eq(tareas.id, data.id));

		getTareas().refresh();

		return { success: true };
	}
);

export const actualizarEstadoTarea = command(
	v.object({
		id: v.pipe(v.string(), v.transform(Number), v.number()),
		estado: v.enum(EstadosTarea)
	}),
	async (data) => {
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		await db
			.update(tareas)
			.set({
				estado: data.estado,
				updated_at: new Date()
			})
			.where(eq(tareas.id, data.id));

		getTareas().refresh();

		return { success: true };
	}
);

export const eliminarTarea = command(
	v.pipe(v.string(), v.transform(Number), v.number()),
	async (id) => {
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		await db.delete(tareas).where(eq(tareas.id, id));

		getTareas().refresh();

		return { success: true };
	}
);

export const reordenarTareas = command(
	v.object({
		tareas: v.array(v.object({ id: v.number(), orden: v.number() }))
	}),
	async (data) => {
		for (const t of data.tareas) {
			await db
				.update(tareas)
				.set({ orden: t.orden, updated_at: new Date() })
				.where(eq(tareas.id, t.id));
		}

		getTareas().refresh();
		return { success: true };
	}
);
