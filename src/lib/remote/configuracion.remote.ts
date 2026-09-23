import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	categorias_productos,
	configuracion_empresa,
	estados_fabricacion,
	estados_pedido
} from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requirePermission } from '$lib/server/auth/permissions';

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
		const [categoria] = await db.insert(categorias_productos).values(data).returning();
		getCategoriasProductoAdmin().refresh();
		return categoria;
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
			.set(data)
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

export const getEstadosFabricacionAdmin = query(async () =>
	db.select().from(estados_fabricacion).orderBy(asc(estados_fabricacion.orden))
);

const estadoSchema = v.object({
	nombre: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	slug: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	grupo: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	orden: v.number(),
	color: v.optional(v.string()),
	es_final: v.optional(v.boolean(), false)
});

export const crearEstadoFabricacion = command(estadoSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const [estado] = await db.insert(estados_fabricacion).values(data).returning();
	getEstadosFabricacionAdmin().refresh();
	return estado;
});

export const actualizarEstadoFabricacion = command(
	v.object({ id: v.number(), ...estadoSchema.entries }),
	async ({ id, ...data }) => {
		await requirePermission('configuracion', 'edit');
		const [estado] = await db
			.update(estados_fabricacion)
			.set(data)
			.where(eq(estados_fabricacion.id, id))
			.returning();
		getEstadosFabricacionAdmin().refresh();
		return estado;
	}
);

export const eliminarEstadoFabricacion = command(idSchema, async ({ id }) => {
	await requirePermission('configuracion', 'edit');
	await db.delete(estados_fabricacion).where(eq(estados_fabricacion.id, id));
	getEstadosFabricacionAdmin().refresh();
	return { success: true };
});

export const getEstadosPedidoAdmin = query(async () =>
	db.select().from(estados_pedido).orderBy(asc(estados_pedido.orden))
);

export const crearEstadoPedidoAdmin = command(estadoSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const [estado] = await db.insert(estados_pedido).values(data).returning();
	getEstadosPedidoAdmin().refresh();
	return estado;
});

export const actualizarEstadoPedidoAdmin = command(
	v.object({ id: v.number(), ...estadoSchema.entries }),
	async ({ id, ...data }) => {
		await requirePermission('configuracion', 'edit');
		const [estado] = await db
			.update(estados_pedido)
			.set(data)
			.where(eq(estados_pedido.id, id))
			.returning();
		getEstadosPedidoAdmin().refresh();
		return estado;
	}
);

export const eliminarEstadoPedidoAdmin = command(idSchema, async ({ id }) => {
	await requirePermission('configuracion', 'edit');
	await db.delete(estados_pedido).where(eq(estados_pedido.id, id));
	getEstadosPedidoAdmin().refresh();
	return { success: true };
});
