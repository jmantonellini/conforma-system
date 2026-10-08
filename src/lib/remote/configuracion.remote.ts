import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { db } from '$lib/server/db';
import {
	categorias_productos,
	configuracion_empresa,
	estados_fabricacion,
	estados_pedido,
	estados_cotizacion,
	cotizaciones,
	transiciones_estado,
	pedidos,
	unidades_fabricacion
} from '$lib/server/db/schema';
import { and, asc, eq, or } from 'drizzle-orm';
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

const tipoEstadoSchema = v.picklist(['cotizacion', 'pedido', 'fabricacion']);

export const getTransicionesEstadoAdmin = query(tipoEstadoSchema, async (tipo) =>
	db
		.select()
		.from(transiciones_estado)
		.where(eq(transiciones_estado.tipo, tipo))
		.orderBy(asc(transiciones_estado.estado_origen_id), asc(transiciones_estado.estado_destino_id))
);

export const crearTransicionEstadoAdmin = command(
	v.object({
		tipo: tipoEstadoSchema,
		estado_origen_id: v.number(),
		estado_destino_id: v.number()
	}),
	async ({ tipo, estado_origen_id, estado_destino_id }) => {
		await requirePermission('configuracion', 'edit');
		if (estado_origen_id === estado_destino_id) {
			throw new Error('El estado de origen y destino deben ser distintos.');
		}

		const estados =
			tipo === 'cotizacion'
				? await db.select({ id: estados_cotizacion.id }).from(estados_cotizacion)
				: tipo === 'pedido'
					? await db.select({ id: estados_pedido.id }).from(estados_pedido)
					: await db.select({ id: estados_fabricacion.id }).from(estados_fabricacion);
		const ids = new Set(estados.map((estado) => estado.id));
		if (!ids.has(estado_origen_id) || !ids.has(estado_destino_id)) {
			throw new Error('Los estados deben pertenecer al mismo flujo.');
		}

		const [existente] = await db
			.select({ id: transiciones_estado.id })
			.from(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, tipo),
					eq(transiciones_estado.estado_origen_id, estado_origen_id),
					eq(transiciones_estado.estado_destino_id, estado_destino_id)
				)
			)
			.limit(1);
		if (existente) throw new Error('Esa transición ya existe.');

		const [transicion] = await db
			.insert(transiciones_estado)
			.values({ tipo, estado_origen_id, estado_destino_id })
			.returning();
		getTransicionesEstadoAdmin(tipo).refresh();
		return transicion;
	}
);

export const eliminarTransicionEstadoAdmin = command(
	v.object({ id: v.number(), tipo: tipoEstadoSchema }),
	async ({ id, tipo }) => {
		await requirePermission('configuracion', 'edit');
		await db
			.delete(transiciones_estado)
			.where(and(eq(transiciones_estado.id, id), eq(transiciones_estado.tipo, tipo)));
		getTransicionesEstadoAdmin(tipo).refresh();
		return { success: true };
	}
);

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
	await db.transaction(async (tx) => {
		const [unidad] = await tx
			.select({ id: unidades_fabricacion.id })
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.estado_id, id))
			.limit(1);
		if (unidad) {
			throw new Error('No se puede eliminar: hay unidades de fabricación en este estado.');
		}
		await tx
			.delete(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'fabricacion'),
					or(
						eq(transiciones_estado.estado_origen_id, id),
						eq(transiciones_estado.estado_destino_id, id)
					)
				)
			);
		await tx.delete(estados_fabricacion).where(eq(estados_fabricacion.id, id));
	});
	getEstadosFabricacionAdmin().refresh();
	getTransicionesEstadoAdmin('fabricacion').refresh();
	return { success: true };
});

export const getEstadosPedidoAdmin = query(async () =>
	db.select().from(estados_pedido).orderBy(asc(estados_pedido.orden))
);

export const getEstadosCotizacionAdmin = query(async () =>
	db.select().from(estados_cotizacion).orderBy(asc(estados_cotizacion.orden))
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
	await db.transaction(async (tx) => {
		const [pedido] = await tx
			.select({ id: pedidos.id })
			.from(pedidos)
			.where(eq(pedidos.estado_id, id))
			.limit(1);
		if (pedido) {
			throw new Error('No se puede eliminar: hay pedidos en este estado.');
		}
		await tx
			.delete(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'pedido'),
					or(
						eq(transiciones_estado.estado_origen_id, id),
						eq(transiciones_estado.estado_destino_id, id)
					)
				)
			);
		await tx.delete(estados_pedido).where(eq(estados_pedido.id, id));
	});
	getEstadosPedidoAdmin().refresh();
	getTransicionesEstadoAdmin('pedido').refresh();
	return { success: true };
});

export const crearEstadoCotizacionAdmin = command(estadoSchema, async (data) => {
	await requirePermission('configuracion', 'edit');
	const [estado] = await db.insert(estados_cotizacion).values(data).returning();
	getEstadosCotizacionAdmin().refresh();
	return estado;
});

export const actualizarEstadoCotizacionAdmin = command(
	v.object({ id: v.number(), ...estadoSchema.entries }),
	async ({ id, ...data }) => {
		await requirePermission('configuracion', 'edit');
		const [estado] = await db
			.update(estados_cotizacion)
			.set(data)
			.where(eq(estados_cotizacion.id, id))
			.returning();
		getEstadosCotizacionAdmin().refresh();
		return estado;
	}
);

export const eliminarEstadoCotizacionAdmin = command(idSchema, async ({ id }) => {
	await requirePermission('configuracion', 'edit');
	await db.transaction(async (tx) => {
		const [cotizacion] = await tx
			.select({ id: cotizaciones.id })
			.from(cotizaciones)
			.where(eq(cotizaciones.estado_id, id))
			.limit(1);
		if (cotizacion) {
			throw new Error(
				'No se puede eliminar: hay cotizaciones en este estado. Cambialas de estado primero.'
			);
		}
		await tx
			.delete(transiciones_estado)
			.where(
				and(
					eq(transiciones_estado.tipo, 'cotizacion'),
					or(
						eq(transiciones_estado.estado_origen_id, id),
						eq(transiciones_estado.estado_destino_id, id)
					)
				)
			);
		await tx.delete(estados_cotizacion).where(eq(estados_cotizacion.id, id));
	});
	getEstadosCotizacionAdmin().refresh();
	getTransicionesEstadoAdmin('cotizacion').refresh();
	return { success: true };
});
