import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { tareas, empleados } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from './usuarios.remote';
import { EstadosTarea, Prioridades } from '$lib/types';

const TareaSchema = v.object({
	titulo: v.pipe(v.string(), v.nonEmpty('El título es requerido')),
	descripcion: v.optional(v.string()),
	estado: v.optional(v.enum(EstadosTarea), EstadosTarea.PENDIENTE),
	prioridad: v.optional(v.enum(Prioridades), Prioridades.MEDIA),
	fecha_entrega: v.optional(v.string()),
	asignado_a: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});

// --- Queries ---
export const getTareas = query(async () => {
	const tareasConEmpleado = await db
		.select({
			id: tareas.id,
			titulo: tareas.titulo,
			descripcion: tareas.descripcion,
			estado: tareas.estado,
			prioridad: tareas.prioridad,
			fecha_entrega: tareas.fecha_entrega,
			asignado_a: tareas.asignado_a,
			empleado: {
				id: empleados.id,
				nombre: empleados.nombre
			}
		})
		.from(tareas)
		.leftJoin(empleados, eq(tareas.asignado_a, empleados.id))
		.orderBy(asc(tareas.orden));

	return tareasConEmpleado;
});

// --- Forms ---
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
			titulo: data.titulo,
			descripcion: data.descripcion,
			estado: data.estado,
			prioridad: data.prioridad,
			fecha_entrega: data.fecha_entrega ? new Date(data.fecha_entrega) : null,
			asignado_a: data.asignado_a || null,
			orden: nuevoOrden
		})
		.returning();

	getTareas().refresh();

	return { success: true, tarea };
});

// --- Commands ---
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

export const actualizarOrdenTareas = command(
	v.object({
		tareas: v.array(v.object({ id: v.number(), orden: v.number() }))
	}),
	async (data) => {
		const user = await getCurrentUser();

		if (!user) throw new Error('No autorizado');

		for (const tarea of data.tareas) {
			await db
				.update(tareas)
				.set({
					orden: tarea.orden,
					updated_at: new Date()
				})
				.where(eq(tareas.id, tarea.id));
		}

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

// Command: reordenar tareas
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
