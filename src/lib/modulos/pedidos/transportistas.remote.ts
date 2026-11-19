import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contactos, envios, pedidos, transportistas } from '$lib/server/db/schema';
import { requirePermission, tienePermiso, usuarioDeSesion } from '$lib/server/auth/permissions';
import { RETIRA_EN_FABRICA } from '$lib/modulos/ventas/trabajo';

const NombreSchema = v.pipe(
	v.string(),
	v.trim(),
	v.nonEmpty('Escribí el nombre del transportista'),
	v.maxLength(100)
);

const mismoNombre = (columna: typeof transportistas.nombre, nombre: string) =>
	sql`lower(${columna}) = lower(${nombre})`;

function refrescar() {
	getNombresTransportistas().refresh();
	getTransportistasGestion().refresh();
}

export const getNombresTransportistas = query(async () => {
	if (!(await usuarioDeSesion())) error(401, 'No autorizado');
	const filas = await db
		.select({ nombre: transportistas.nombre })
		.from(transportistas)
		.where(eq(transportistas.activo, true))
		.orderBy(asc(transportistas.nombre));
	return filas
		.map((fila) => fila.nombre)
		.filter((nombre) => nombre.toLowerCase() !== RETIRA_EN_FABRICA.toLowerCase());
});

export const getTransportistasGestion = query(async () => {
	await requirePermission('envios', 'view');
	return db
		.select({
			id: transportistas.id,
			nombre: transportistas.nombre,
			activo: transportistas.activo,
			envios: count(envios.id)
		})
		.from(transportistas)
		.leftJoin(envios, eq(envios.transportista_id, transportistas.id))
		.where(sql`lower(${transportistas.nombre}) <> lower(${RETIRA_EN_FABRICA})`)
		.groupBy(transportistas.id)
		.orderBy(asc(transportistas.nombre));
});

export const agregarTransportista = command(NombreSchema, async (nombre) => {
	const user = await usuarioDeSesion();
	if (!user) error(401, 'No autorizado');
	const permisos = await Promise.all([
		tienePermiso(user, 'contactos', 'edit'),
		tienePermiso(user, 'contactos', 'create'),
		tienePermiso(user, 'pedidos', 'edit'),
		tienePermiso(user, 'envios', 'edit')
	]);
	if (!permisos.some(Boolean)) error(403, 'No tenés permiso para agregar transportistas');
	if (nombre.toLowerCase() === RETIRA_EN_FABRICA.toLowerCase()) return RETIRA_EN_FABRICA;
	const [existente] = await db
		.select({ id: transportistas.id, nombre: transportistas.nombre })
		.from(transportistas)
		.where(mismoNombre(transportistas.nombre, nombre))
		.limit(1);
	if (existente) {
		await db
			.update(transportistas)
			.set({ activo: true })
			.where(eq(transportistas.id, existente.id));
	} else {
		await db.insert(transportistas).values({ nombre });
	}
	refrescar();
	return existente?.nombre ?? nombre;
});

export const renombrarTransportista = command(
	v.object({ id: v.pipe(v.number(), v.integer()), nombre: NombreSchema }),
	async ({ id, nombre }) => {
		await requirePermission('envios', 'edit');
		if (nombre.toLowerCase() === RETIRA_EN_FABRICA.toLowerCase())
			error(400, `"${RETIRA_EN_FABRICA}" ya es una opción fija`);
		await db.transaction(async (tx) => {
			const [actual] = await tx
				.select({ nombre: transportistas.nombre })
				.from(transportistas)
				.where(eq(transportistas.id, id))
				.for('update');
			if (!actual) error(404, 'Transportista no encontrado');
			const [repetido] = await tx
				.select({ id: transportistas.id })
				.from(transportistas)
				.where(and(ne(transportistas.id, id), mismoNombre(transportistas.nombre, nombre)))
				.limit(1);
			if (repetido) error(409, `Ya existe un transportista llamado ${nombre}`);
			await tx.update(transportistas).set({ nombre }).where(eq(transportistas.id, id));
			await tx
				.update(contactos)
				.set({ entrega_transportista: nombre })
				.where(sql`lower(${contactos.entrega_transportista}) = lower(${actual.nombre})`);
			await tx
				.update(pedidos)
				.set({ entrega_transportista: nombre })
				.where(sql`lower(${pedidos.entrega_transportista}) = lower(${actual.nombre})`);
		});
		refrescar();
		return { success: true };
	}
);

export const cambiarActivoTransportista = command(
	v.object({ id: v.pipe(v.number(), v.integer()), activo: v.boolean() }),
	async ({ id, activo }) => {
		await requirePermission('envios', 'edit');
		const [actualizado] = await db
			.update(transportistas)
			.set({ activo })
			.where(eq(transportistas.id, id))
			.returning({ id: transportistas.id });
		if (!actualizado) error(404, 'Transportista no encontrado');
		refrescar();
		return { success: true };
	}
);
