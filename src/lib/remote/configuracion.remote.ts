import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import {
	FLUJOS_ESTADO,
	categorias_productos,
	configuracion_empresa,
	cotizaciones,
	estados,
	pedidos,
	transiciones_estado,
	unidades_fabricacion
} from '$lib/server/db/schema';
import { asc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { listarEstados } from '$lib/server/estados';
import { requirePermission } from '$lib/server/auth/permissions';
import { toSlug } from '$lib/utils/ids';

const idSchema = v.object({ id: v.number() });

export const getCategoriasProductoAdmin = query(async () =>
	db.select().from(categorias_productos).orderBy(asc(categorias_productos.nombre))
);

const EmpresaConfigSchema = v.object({
	razon_social: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	cuit: v.optional(v.string()),
	direccion: v.optional(v.string()),
	telefono: v.optional(v.string()),
	email: v.optional(v.string())
});

export const getConfiguracionEmpresa = query(async () => {
	const [config] = await db
		.select()
		.from(configuracion_empresa)
		.where(eq(configuracion_empresa.id, 1));
	return config ?? { id: 1, razon_social: 'Conforma', logo_url: null };
});

export const actualizarConfiguracionEmpresa = form(EmpresaConfigSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const [config] = await db
		.insert(configuracion_empresa)
		.values({ id: 1, ...data, updated_at: new Date() })
		.onConflictDoUpdate({
			target: configuracion_empresa.id,
			set: { ...data, updated_at: new Date() }
		})
		.returning();
	getConfiguracionEmpresa().refresh();
	return config;
});

export const crearCategoriaProducto = command(
	v.object({
		nombre: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		descripcion: v.optional(v.string())
	}),
	async (data) => {
		await requirePermission('configuracion', 'edit');
		const [categoria] = await db
			.insert(categorias_productos)
			.values({ ...data, slug: toSlug(data.nombre) })
			.onConflictDoNothing({ target: categorias_productos.nombre })
			.returning();
		getCategoriasProductoAdmin().refresh();
		return { creada: Boolean(categoria) };
	}
);

export const actualizarCategoriaProducto = command(
	v.object({
		id: v.number(),
		nombre: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		descripcion: v.optional(v.string())
	}),
	async ({ id, ...data }) => {
		await requirePermission('configuracion', 'edit');
		const [categoria] = await db
			.update(categorias_productos)
			.set({ ...data, slug: toSlug(data.nombre) })
			.where(eq(categorias_productos.id, id))
			.returning();
		getCategoriasProductoAdmin().refresh();
		return categoria;
	}
);

export const eliminarCategoriaProducto = command(idSchema, async ({ id }) => {
	await requirePermission('configuracion', 'edit');
	await db.delete(categorias_productos).where(eq(categorias_productos.id, id));
	getCategoriasProductoAdmin().refresh();
	return { success: true };
});

const flujoSchema = v.picklist(FLUJOS_ESTADO);

const estadoSchema = v.object({
	flujo: flujoSchema,
	nombre: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	slug: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	grupo: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	orden: v.number(),
	color: v.optional(v.string()),
	es_final: v.optional(v.boolean(), false)
});

/** Tabla y columna que referencian estados de cada flujo (para impedir borrar estados en uso). */
const ENTIDADES_POR_FLUJO = {
	cotizacion: { columna: cotizaciones.estado_id, nombre: 'cotizaciones' },
	pedido: { columna: pedidos.estado_id, nombre: 'pedidos' },
	fabricacion: { columna: unidades_fabricacion.estado_id, nombre: 'unidades de fabricación' }
} as const;

export const getEstadosAdmin = query(flujoSchema, async (flujo) => {
	await requirePermission('configuracion', 'view');
	return listarEstados(flujo);
});

export const getTransicionesEstadoAdmin = query(flujoSchema, async (flujo) => {
	await requirePermission('configuracion', 'view');
	return db
		.select(getTableColumns(transiciones_estado))
		.from(transiciones_estado)
		.innerJoin(estados, eq(estados.id, transiciones_estado.estado_origen_id))
		.where(eq(estados.flujo, flujo))
		.orderBy(asc(transiciones_estado.estado_origen_id), asc(transiciones_estado.estado_destino_id));
});

export const guardarEstado = command(
	v.object({ id: v.optional(v.number()), ...estadoSchema.entries }),
	async ({ id, ...data }) => {
		await requirePermission('configuracion', 'edit');
		const [estado] = id
			? await db.update(estados).set(data).where(eq(estados.id, id)).returning()
			: await db.insert(estados).values(data).returning();
		getEstadosAdmin(data.flujo).refresh();
		return estado;
	}
);

export const eliminarEstado = command(idSchema, async ({ id }) => {
	await requirePermission('configuracion', 'edit');
	const [estado] = await db.select().from(estados).where(eq(estados.id, id)).limit(1);
	if (!estado) error(404, 'Estado no encontrado');

	const { columna, nombre } = ENTIDADES_POR_FLUJO[estado.flujo];
	const [enUso] = await db
		.select({ id: columna })
		.from(columna.table)
		.where(eq(columna, id))
		.limit(1);
	if (enUso) error(409, `No se puede eliminar: hay ${nombre} en este estado.`);

	// Las transiciones del estado se borran en cascada.
	await db.delete(estados).where(eq(estados.id, id));
	getEstadosAdmin(estado.flujo).refresh();
	getTransicionesEstadoAdmin(estado.flujo).refresh();
	return { success: true };
});

export const crearTransicionEstadoAdmin = command(
	v.object({ estado_origen_id: v.number(), estado_destino_id: v.number() }),
	async ({ estado_origen_id, estado_destino_id }) => {
		await requirePermission('configuracion', 'edit');
		if (estado_origen_id === estado_destino_id) {
			error(400, 'El estado de origen y destino deben ser distintos.');
		}
		const flujos = await db
			.selectDistinct({ flujo: estados.flujo })
			.from(estados)
			.where(inArray(estados.id, [estado_origen_id, estado_destino_id]));
		if (flujos.length !== 1) error(400, 'Los estados deben pertenecer al mismo flujo.');

		const [transicion] = await db
			.insert(transiciones_estado)
			.values({ estado_origen_id, estado_destino_id })
			.onConflictDoNothing()
			.returning();
		if (!transicion) error(409, 'Esa transición ya existe.');
		getTransicionesEstadoAdmin(flujos[0].flujo).refresh();
		return transicion;
	}
);

export const eliminarTransicionEstadoAdmin = command(
	v.object({ id: v.number(), flujo: flujoSchema }),
	async ({ id, flujo }) => {
		await requirePermission('configuracion', 'edit');
		await db.delete(transiciones_estado).where(eq(transiciones_estado.id, id));
		getTransicionesEstadoAdmin(flujo).refresh();
		return { success: true };
	}
);
