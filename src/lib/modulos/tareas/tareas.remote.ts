import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { asc, desc, eq, max } from 'drizzle-orm';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import { empleados, tareas, usuarios } from '$lib/server/db/schema';
import { usuarioDeSesion } from '$lib/server/auth/permissions';
import { notificar } from '$lib/modulos/notificaciones/notificaciones.server';
import { EstadosTarea } from './tipos';
import { FiltroTareasSchema, TareaSchema } from './tareas.schema';

async function usuarioActual() {
	const usuario = await usuarioDeSesion();
	if (!usuario) error(401, 'Sesión vencida');
	return usuario;
}

const completadaEn = (estado: EstadosTarea) =>
	estado === EstadosTarea.COMPLETADA ? new Date() : null;

const fechaDe = (valor?: string) => (valor ? new Date(`${valor}T12:00:00`) : null);

export const getTareas = query(FiltroTareasSchema, async ({ archivadas }) => {
	await usuarioActual();
	return db
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
			completada_at: tareas.completada_at,
			created_at: tareas.created_at,
			creada_por: usuarios.username,
			empleado: { id: empleados.id, nombre: empleados.nombre, apellido: empleados.apellido }
		})
		.from(tareas)
		.leftJoin(empleados, eq(tareas.asignado_a, empleados.id))
		.leftJoin(usuarios, eq(tareas.creada_por, usuarios.id))
		.where(eq(tareas.archivada, archivadas))
		.orderBy(asc(tareas.orden), desc(tareas.id));
});

export type TareaListada = Awaited<ReturnType<typeof getTareas>>[number];

export const guardarTarea = form(TareaSchema, async ({ id, fecha_entrega, ...datos }) => {
	const usuario = await usuarioActual();
	const valores = {
		...datos,
		descripcion: datos.descripcion || null,
		asignado_a: datos.asignado_a ?? null,
		fecha_entrega: fechaDe(fecha_entrega)
	};

	let asignadoAnterior: number | null = null;
	if (id) {
		const [actual] = await db
			.select({ estado: tareas.estado, asignado_a: tareas.asignado_a })
			.from(tareas)
			.where(eq(tareas.id, id));
		if (!actual) error(404, 'Tarea no encontrada');
		asignadoAnterior = actual.asignado_a;
		await db
			.update(tareas)
			.set({
				...valores,
				...(actual.estado !== datos.estado && { completada_at: completadaEn(datos.estado) })
			})
			.where(eq(tareas.id, id));
	} else {
		const [{ ultimo }] = await db.select({ ultimo: max(tareas.orden) }).from(tareas);
		const [creada] = await db
			.insert(tareas)
			.values({
				...valores,
				creada_por: usuario.id,
				completada_at: completadaEn(datos.estado),
				orden: (ultimo ?? -1) + 1
			})
			.returning({ id: tareas.id });
		id = creada.id;
	}

	if (valores.asignado_a && valores.asignado_a !== asignadoAnterior) {
		await notificar(
			{ empleados: [valores.asignado_a] },
			{
				modulo: 'tarea',
				titulo: 'Te asignaron una tarea',
				mensaje: datos.titulo,
				link: '/tareas'
			},
			{ actor: usuario.id }
		);
	}

	getTareas({}).refresh();
	return { id };
});

export const moverTarea = command(
	v.object({ id: v.number(), estado: v.enum(EstadosTarea) }),
	async ({ id, estado }) => {
		const usuario = await usuarioActual();
		const [tarea] = await db
			.update(tareas)
			.set({ estado, completada_at: completadaEn(estado) })
			.where(eq(tareas.id, id))
			.returning({ titulo: tareas.titulo, creada_por: tareas.creada_por });
		if (tarea && estado === EstadosTarea.COMPLETADA) {
			await notificar(
				{ usuarios: [tarea.creada_por] },
				{
					modulo: 'tarea',
					titulo: `${usuario.empleado?.nombre ?? usuario.username} completó una tarea`,
					mensaje: tarea.titulo,
					link: '/tareas'
				},
				{ actor: usuario.id }
			);
		}
		getTareas({}).refresh();
	}
);

export const reordenarTareas = command(
	v.array(v.object({ id: v.number(), orden: v.number() })),
	async (orden) => {
		await usuarioActual();
		await db.transaction(async (tx) => {
			for (const { id, orden: posicion } of orden) {
				await tx.update(tareas).set({ orden: posicion }).where(eq(tareas.id, id));
			}
		});
		getTareas({}).refresh();
	}
);

export const archivarTarea = command(
	v.object({ id: v.number(), archivada: v.boolean() }),
	async ({ id, archivada }) => {
		await usuarioActual();
		await db.update(tareas).set({ archivada }).where(eq(tareas.id, id));
		getTareas({}).refresh();
		getTareas({ archivadas: true }).refresh();
	}
);

export const eliminarTarea = command(v.number(), async (id) => {
	await usuarioActual();
	await db.delete(tareas).where(eq(tareas.id, id));
	getTareas({}).refresh();
	getTareas({ archivadas: true }).refresh();
});
