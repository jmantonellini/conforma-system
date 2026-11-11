import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { command, form, query, requested } from '$app/server';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	categorias_insumos,
	contactos,
	empleados,
	insumos,
	movimientos_insumos,
	ordenes_fabricacion,
	proveedores,
	tipos_insumo,
	unidades_medida
} from '$lib/server/db/schema';
import { ImportarInsumosSchema, InsumoSchema, InsumoSchemaUpdate } from './insumos.schema';
import { requirePermission, tienePermiso } from '$lib/server/auth/permissions';
import {
	obtenerInsumosRequeridosOrdenTx,
	registrarMovimientoInsumoTx,
	verificarEmpleadoActivo
} from '$lib/server/services/insumos-inventario.service';

function normalizarCodigoCatalogo(valor: string, prefijo: string) {
	const base = valor
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toLowerCase();
	return (base || `${prefijo}_${Date.now().toString(36)}`).slice(0, 50);
}

async function crearTipoInsumoSiFalta(nombre: string) {
	const valor = nombre?.trim();
	if (!valor) return undefined;
	const codigo = normalizarCodigoCatalogo(valor, 'tipo');
	const [existente] = await db
		.select()
		.from(tipos_insumo)
		.where(or(eq(tipos_insumo.codigo, codigo), ilike(tipos_insumo.nombre, valor)))
		.limit(1);
	if (existente) return existente;
	const [tipo] = await db
		.insert(tipos_insumo)
		.values({ codigo, nombre: valor, activo: true })
		.returning();
	return tipo;
}

async function crearUnidadMedidaSiFalta(nombre: string) {
	const valor = nombre?.trim();
	if (!valor) return undefined;
	const codigo = normalizarCodigoCatalogo(valor, 'unidad');
	const [existente] = await db
		.select()
		.from(unidades_medida)
		.where(or(eq(unidades_medida.codigo, codigo), ilike(unidades_medida.nombre, valor)))
		.limit(1);
	if (existente) return existente;
	const [unidad] = await db
		.insert(unidades_medida)
		.values({ codigo, nombre: valor, dimension: 'general', activo: true })
		.returning();
	return unidad;
}

async function crearCategoriaInsumoSiFalta(nombre: string) {
	const valor = nombre?.trim();
	if (!valor) return undefined;
	const [existente] = await db
		.select()
		.from(categorias_insumos)
		.where(ilike(categorias_insumos.nombre, valor))
		.limit(1);
	if (existente) return existente;
	const [categoria] = await db
		.insert(categorias_insumos)
		.values({
			nombre: valor,
			descripcion: 'Creada automáticamente durante importación',
			activo: true
		})
		.returning();
	return categoria;
}

async function crearProveedorSiFalta(nombre: string) {
	const valor = nombre?.trim();
	if (!valor) return undefined;
	const codigo = normalizarCodigoCatalogo(valor, 'prov');
	const [empresaExistente] = await db
		.select()
		.from(contactos)
		.where(ilike(contactos.razon_social, valor))
		.limit(1);

	const contacto_id =
		empresaExistente?.id ??
		(
			await db
				.insert(contactos)
				.values({ razon_social: valor, pais: 'Argentina', activo: true, es_cliente: false })
				.returning()
		).at(0)?.id;

	if (!contacto_id) return undefined;

	const [proveedorExistente] = await db
		.select()
		.from(proveedores)
		.where(or(eq(proveedores.codigo, codigo), eq(proveedores.contacto_id, contacto_id)))
		.limit(1);
	if (proveedorExistente) return proveedorExistente;
	const [proveedor] = await db
		.insert(proveedores)
		.values({ contacto_id, codigo, activo: true })
		.returning();
	return proveedor;
}

async function resolverCatalogos(tipo: string, unidad: string) {
	const tipoId = Number(tipo);
	const unidadId = Number(unidad);
	const [tipoCatalogo, unidadCatalogo] = await Promise.all([
		db
			.select({ id: tipos_insumo.id, codigo: tipos_insumo.codigo, nombre: tipos_insumo.nombre })
			.from(tipos_insumo)
			.where(
				tipoId > 0
					? eq(tipos_insumo.id, tipoId)
					: or(eq(tipos_insumo.codigo, tipo), ilike(tipos_insumo.nombre, tipo))
			)
			.limit(1),
		db
			.select({
				id: unidades_medida.id,
				codigo: unidades_medida.codigo,
				nombre: unidades_medida.nombre
			})
			.from(unidades_medida)
			.where(
				unidadId > 0
					? eq(unidades_medida.id, unidadId)
					: or(eq(unidades_medida.codigo, unidad), ilike(unidades_medida.nombre, unidad))
			)
			.limit(1)
	]);

	const tipoResolvido = tipoCatalogo[0] ?? (await crearTipoInsumoSiFalta(tipo));
	const unidadResolvida = unidadCatalogo[0] ?? (await crearUnidadMedidaSiFalta(unidad));

	return {
		tipo: tipoResolvido?.codigo ?? tipo,
		tipo_id: tipoResolvido?.id,
		unidad: unidadResolvida?.codigo ?? unidad,
		unidad_id: unidadResolvida?.id
	};
}

async function resolverImportacion(fila: {
	tipo: string;
	unidad: string;
	categoria?: string;
	proveedor?: string;
}) {
	const catalogo = await resolverCatalogos(fila.tipo, fila.unidad);
	const [categoria, proveedor] = await Promise.all([
		fila.categoria
			? db
					.select({ id: categorias_insumos.id })
					.from(categorias_insumos)
					.where(
						or(
							ilike(categorias_insumos.nombre, fila.categoria),
							eq(categorias_insumos.id, Number(fila.categoria) || -1)
						)
					)
					.limit(1)
			: [],
		fila.proveedor
			? db
					.select({ id: proveedores.id })
					.from(proveedores)
					.innerJoin(contactos, eq(proveedores.contacto_id, contactos.id))
					.where(
						or(
							eq(proveedores.codigo, fila.proveedor),
							ilike(contactos.razon_social, fila.proveedor),
							eq(proveedores.id, Number(fila.proveedor) || -1)
						)
					)
					.limit(1)
			: []
	]);

	const categoriaFinal =
		categoria[0] ??
		(fila.categoria ? await crearCategoriaInsumoSiFalta(fila.categoria) : undefined);
	const proveedorFinal =
		proveedor[0] ?? (fila.proveedor ? await crearProveedorSiFalta(fila.proveedor) : undefined);

	return {
		...catalogo,
		categoria_id: categoriaFinal?.id,
		proveedor_id: proveedorFinal?.id
	};
}

function normalizarOpcionales<T extends { categoria_id?: number; proveedor_id?: number }>(data: T) {
	return {
		...data,
		categoria_id: data.categoria_id || undefined,
		proveedor_id: data.proveedor_id || undefined
	};
}

function costoConFlete(costo: number, flete = 0) {
	return costo * (1 + flete / 100);
}

export const getInsumos = query(
	v.object({
		search: v.optional(v.string()),
		tipo: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		sort: v.optional(v.picklist(['nombre', 'codigo', 'costo_unitario']), 'nombre'),
		direction: v.optional(v.picklist(['asc', 'desc']), 'asc'),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({
		search,
		tipo,
		categoriaId,
		sort = 'nombre',
		direction = 'asc',
		page = 1,
		limit = 20
	}) => {
		const conditions = [];
		if (search) {
			const term = `%${search}%`;
			conditions.push(or(ilike(insumos.codigo, term), ilike(insumos.nombre, term)));
		}
		if (tipo) {
			const tipoId = Number(tipo);
			conditions.push(
				Number.isInteger(tipoId) ? eq(insumos.tipo_id, tipoId) : eq(insumos.tipo, tipo)
			);
		}
		if (categoriaId) conditions.push(eq(insumos.categoria_id, categoriaId));
		const where = conditions.length ? and(...conditions) : undefined;
		const columnaOrden = {
			nombre: insumos.nombre,
			codigo: insumos.codigo,
			costo_unitario: insumos.costo_unitario
		}[sort];
		const orden = direction === 'desc' ? desc(columnaOrden) : asc(columnaOrden);
		const data = await db
			.select({
				insumo: insumos,
				tipo: {
					id: tipos_insumo.id,
					nombre: tipos_insumo.nombre
				},
				categoria: {
					id: categorias_insumos.id,
					nombre: categorias_insumos.nombre
				},
				proveedor: {
					id: proveedores.id,
					nombre: contactos.razon_social
				}
			})
			.from(insumos)
			.leftJoin(tipos_insumo, eq(insumos.tipo_id, tipos_insumo.id))
			.leftJoin(categorias_insumos, eq(insumos.categoria_id, categorias_insumos.id))
			.leftJoin(proveedores, eq(insumos.proveedor_id, proveedores.id))
			.leftJoin(contactos, eq(proveedores.contacto_id, contactos.id))
			.where(where)
			.orderBy(orden)
			.limit(limit)
			.offset((page - 1) * limit);
		const [total] = await db.select({ count: count() }).from(insumos).where(where);
		const insumoIds = data.map((item) => item.insumo.id);
		const saldos = insumoIds.length
			? await db
					.select({
						insumo_id: movimientos_insumos.insumo_id,
						saldo: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos_insumos.tipo} = 'ingreso' THEN ${movimientos_insumos.cantidad} ELSE -${movimientos_insumos.cantidad} END), 0)`
					})
					.from(movimientos_insumos)
					.where(inArray(movimientos_insumos.insumo_id, insumoIds))
					.groupBy(movimientos_insumos.insumo_id)
			: [];
		const saldosPorInsumo = new Map(saldos.map((item) => [item.insumo_id, Number(item.saldo)]));
		return {
			data: data.map(({ insumo, tipo, categoria, proveedor }) => ({
				...insumo,
				tipo,
				categoria,
				proveedor,
				stock: saldosPorInsumo.get(insumo.id) ?? 0
			})),
			total: total?.count ?? 0,
			totalPages: Math.ceil((total?.count ?? 0) / limit),
			currentPage: page
		};
	}
);

export const getMovimientosInsumos = query(
	v.object({
		orden_id: v.optional(v.number()),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 50)
	}),
	async ({ orden_id, limit = 50 }) => {
		await requirePermission('insumos', 'view');
		return db
			.select({
				id: movimientos_insumos.id,
				tipo: movimientos_insumos.tipo,
				fuente: movimientos_insumos.fuente,
				cantidad: movimientos_insumos.cantidad,
				motivo: movimientos_insumos.motivo,
				created_at: movimientos_insumos.created_at,
				insumo: {
					id: insumos.id,
					codigo: insumos.codigo,
					nombre: insumos.nombre,
					unidad: insumos.unidad
				},
				empleado: { id: empleados.id, nombre: empleados.nombre, apellido: empleados.apellido },
				orden_fabricacion_id: movimientos_insumos.orden_fabricacion_id
			})
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(movimientos_insumos.insumo_id, insumos.id))
			.innerJoin(empleados, eq(movimientos_insumos.empleado_id, empleados.id))
			.where(orden_id ? eq(movimientos_insumos.orden_fabricacion_id, orden_id) : undefined)
			.orderBy(desc(movimientos_insumos.created_at), desc(movimientos_insumos.id))
			.limit(limit);
	}
);

export const registrarMovimientoInsumo = command(
	v.object({
		insumo_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
		tipo: v.picklist(['ingreso', 'consumo']),
		cantidad: v.pipe(v.number(), v.minValue(0.000001)),
		empleado_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
		orden_fabricacion_id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
		motivo: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty('Indicá para qué se usó el insumo'),
			v.maxLength(500)
		)
	}),
	async (data) => {
		const user = await requirePermission('insumos', 'edit');
		if (data.orden_fabricacion_id) await requirePermission('fabricacion', 'view');
		await db.transaction(async (tx) => {
			if (!(await verificarEmpleadoActivo(tx, data.empleado_id))) {
				error(400, 'Seleccioná un empleado activo');
			}
			if (data.orden_fabricacion_id) {
				const [orden] = await tx
					.select({ id: ordenes_fabricacion.id })
					.from(ordenes_fabricacion)
					.where(eq(ordenes_fabricacion.id, data.orden_fabricacion_id))
					.limit(1);
				if (!orden) error(404, 'Orden de fabricación no encontrada');
			}
			await registrarMovimientoInsumoTx(tx, { ...data, usuario_id: user.id });
		});
		requested(getInsumos, 1).refreshAll();
		if (await tienePermiso(user, 'insumos', 'view')) {
			getMovimientosInsumos({ limit: 50 }).refresh();
		}
		return { success: true };
	}
);

export const consumirRecetaOrden = command(
	v.object({
		orden_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
		empleado_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
		motivo: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500)))
	}),
	async ({ orden_id, empleado_id, motivo }) => {
		const user = await requirePermission('insumos', 'edit');
		await requirePermission('fabricacion', 'view');
		const cantidadMovimientos = await db.transaction(async (tx) => {
			if (!(await verificarEmpleadoActivo(tx, empleado_id))) {
				error(400, 'Seleccioná un empleado activo');
			}
			const requeridos = await obtenerInsumosRequeridosOrdenTx(tx, orden_id);
			const existentes = await tx
				.select({ id: movimientos_insumos.id })
				.from(movimientos_insumos)
				.where(
					and(
						eq(movimientos_insumos.orden_fabricacion_id, orden_id),
						eq(movimientos_insumos.fuente, 'receta')
					)
				)
				.limit(1);
			if (existentes.length) error(400, 'La receta de esta orden ya fue consumida');

			for (const requerido of requeridos) {
				await registrarMovimientoInsumoTx(tx, {
					insumo_id: requerido.insumo_id,
					tipo: 'consumo',
					fuente: 'receta',
					cantidad: requerido.cantidad,
					orden_fabricacion_id: orden_id,
					empleado_id,
					usuario_id: user.id,
					motivo: motivo || `Consumo de receta de OF-${orden_id}`
				});
			}
			return requeridos.length;
		});
		requested(getInsumos, 1).refreshAll();
		if (await tienePermiso(user, 'insumos', 'view')) {
			getMovimientosInsumos({ orden_id, limit: 100 }).refresh();
		}
		return { success: true, cantidad: cantidadMovimientos };
	}
);

export const getInsumoById = query(v.number(), async (id) => {
	const [resultado] = await db
		.select({
			insumo: insumos,
			tipo: {
				id: tipos_insumo.id,
				nombre: tipos_insumo.nombre
			},
			categoria: {
				id: categorias_insumos.id,
				nombre: categorias_insumos.nombre
			},
			proveedor: {
				id: proveedores.id,
				nombre: contactos.razon_social
			}
		})
		.from(insumos)
		.leftJoin(tipos_insumo, eq(insumos.tipo_id, tipos_insumo.id))
		.leftJoin(categorias_insumos, eq(insumos.categoria_id, categorias_insumos.id))
		.leftJoin(proveedores, eq(insumos.proveedor_id, proveedores.id))
		.leftJoin(contactos, eq(proveedores.contacto_id, contactos.id))
		.where(eq(insumos.id, id))
		.limit(1);
	if (!resultado) error(404, 'Insumo no encontrado');
	return {
		...resultado.insumo,
		tipo: resultado.tipo,
		categoria: resultado.categoria,
		proveedor: resultado.proveedor
	};
});

export const crearInsumo = form(InsumoSchema, async (data) => {
	await requirePermission('insumos', 'create');
	const catalogo = await resolverCatalogos(data.tipo, data.unidad);
	const datos = normalizarOpcionales(data);
	const [insumo] = await db
		.insert(insumos)
		.values({
			...datos,
			costo_unitario: costoConFlete(data.costo_unitario, data.flete_porcentaje),
			...catalogo,
			created_at: new Date(),
			updated_at: new Date()
		})
		.returning();
	getInsumos({}).refresh();
	return { success: true, insumo };
});

export const actualizarInsumo = form(InsumoSchemaUpdate, async ({ id, ...data }) => {
	await requirePermission('insumos', 'edit');
	const catalogo = await resolverCatalogos(data.tipo, data.unidad);
	const datos = normalizarOpcionales(data);
	const [insumo] = await db
		.update(insumos)
		.set({
			...datos,
			costo_unitario: costoConFlete(data.costo_unitario, data.flete_porcentaje),
			...catalogo,
			updated_at: new Date()
		})
		.where(eq(insumos.id, Number(id)))
		.returning();
	getInsumos({}).refresh();
	return { success: true, insumo };
});

export const eliminarInsumo = command(v.number(), async (id) => {
	await requirePermission('insumos', 'delete');
	await db.update(insumos).set({ activo: false, updated_at: new Date() }).where(eq(insumos.id, id));
	getInsumos({}).refresh();
	return { success: true };
});

export const importarInsumos = command(ImportarInsumosSchema, async (filas) => {
	await requirePermission('insumos', 'import');
	for (const fila of filas) {
		const datosFila = { ...fila };
		delete datosFila.categoria;
		delete datosFila.proveedor;
		const catalogo = await resolverImportacion(fila);
		const costoConFlete = fila.costo_unitario * (1 + (fila.flete_porcentaje ?? 0) / 100);
		await db
			.insert(insumos)
			.values({
				...datosFila,
				costo_unitario: costoConFlete,
				...catalogo,
				created_at: new Date(),
				updated_at: new Date()
			})
			.onConflictDoUpdate({
				target: insumos.codigo,
				set: {
					nombre: fila.nombre,
					tipo: catalogo.tipo,
					unidad: catalogo.unidad,
					tipo_id: catalogo.tipo_id,
					unidad_id: catalogo.unidad_id,
					costo_unitario: costoConFlete,
					flete_porcentaje: fila.flete_porcentaje ?? 0,
					categoria_id: catalogo.categoria_id,
					proveedor_id: catalogo.proveedor_id,
					observaciones: fila.observaciones,
					activo: true,
					updated_at: new Date()
				}
			});
	}
	getInsumos({}).refresh();
	return { success: true, cantidad: filas.length };
});

export const getTiposInsumo = query(async () => {
	const tipos = await db
		.select({ id: tipos_insumo.id, nombre: tipos_insumo.nombre })
		.from(tipos_insumo)
		.orderBy(tipos_insumo.nombre);
	return tipos;
});

export const getUnidadesInsumo = query(async () => {
	const unidades = await db
		.select({ id: unidades_medida.id, nombre: unidades_medida.nombre })
		.from(unidades_medida)
		.orderBy(unidades_medida.nombre);
	return unidades;
});

export const getCategoriasInsumo = query(async () => {
	const categorias = await db
		.select({ id: categorias_insumos.id, nombre: categorias_insumos.nombre })
		.from(categorias_insumos)
		.where(eq(categorias_insumos.activo, true))
		.orderBy(categorias_insumos.nombre);
	return categorias;
});

export const obtenerProveedores = query(async () => {
	return db
		.select({ id: proveedores.id, nombre: contactos.razon_social })
		.from(proveedores)
		.innerJoin(contactos, eq(proveedores.contacto_id, contactos.id))
		.where(eq(proveedores.activo, true))
		.orderBy(contactos.razon_social);
});
