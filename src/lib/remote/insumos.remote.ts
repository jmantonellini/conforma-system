import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { and, count, eq, ilike, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categorias_insumos, insumos, tipos_insumo, unidades_medida } from '$lib/server/db/schema';
import { ImportarInsumosSchema, InsumoSchema, InsumoSchemaUpdate } from './insumos.schema';
import { requirePermission } from '$lib/server/auth/permissions';

async function resolverCatalogos(tipo: string, unidad: string) {
	const tipoId = Number(tipo);
	const unidadId = Number(unidad);
	const [tipoCatalogo, unidadCatalogo] = await Promise.all([
		db
			.select({ id: tipos_insumo.id, codigo: tipos_insumo.codigo })
			.from(tipos_insumo)
			.where(Number.isInteger(tipoId) ? eq(tipos_insumo.id, tipoId) : eq(tipos_insumo.codigo, tipo))
			.limit(1),
		db
			.select({ id: unidades_medida.id, codigo: unidades_medida.codigo })
			.from(unidades_medida)
			.where(
				Number.isInteger(unidadId)
					? eq(unidades_medida.id, unidadId)
					: eq(unidades_medida.codigo, unidad)
			)
			.limit(1)
	]);

	return {
		tipo: tipoCatalogo[0]?.codigo ?? tipo,
		tipo_id: tipoCatalogo[0]?.id,
		unidad: unidadCatalogo[0]?.codigo ?? unidad,
		unidad_id: unidadCatalogo[0]?.id
	};
}

export const getInsumos = query(
	v.object({
		search: v.optional(v.string()),
		tipo: v.optional(v.string()),
		categoriaId: v.optional(v.number()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({ search, tipo, categoriaId, page = 1, limit = 20 }) => {
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
				}
			})
			.from(insumos)
			.leftJoin(tipos_insumo, eq(insumos.tipo_id, tipos_insumo.id))
			.leftJoin(categorias_insumos, eq(insumos.categoria_id, categorias_insumos.id))
			.where(where)
			.orderBy(insumos.nombre)
			.limit(limit)
			.offset((page - 1) * limit);
		const [total] = await db.select({ count: count() }).from(insumos).where(where);
		return {
			data: data.map(({ insumo, tipo, categoria }) => ({ ...insumo, tipo, categoria })),
			total: total?.count ?? 0,
			totalPages: Math.ceil((total?.count ?? 0) / limit),
			currentPage: page
		};
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
			}
		})
		.from(insumos)
		.leftJoin(tipos_insumo, eq(insumos.tipo_id, tipos_insumo.id))
		.leftJoin(categorias_insumos, eq(insumos.categoria_id, categorias_insumos.id))
		.where(eq(insumos.id, id))
		.limit(1);
	if (!resultado) throw new Error('Insumo no encontrado');
	return { ...resultado.insumo, tipo: resultado.tipo, categoria: resultado.categoria };
});

export const crearInsumo = form(InsumoSchema, async (data) => {
	await requirePermission('insumos', 'create');
	const catalogo = await resolverCatalogos(data.tipo, data.unidad);
	const [insumo] = await db
		.insert(insumos)
		.values({ ...data, ...catalogo, created_at: new Date(), updated_at: new Date() })
		.returning();
	getInsumos({}).refresh();
	return { success: true, insumo };
});

export const actualizarInsumo = form(InsumoSchemaUpdate, async ({ id, ...data }) => {
	await requirePermission('insumos', 'edit');
	const catalogo = await resolverCatalogos(data.tipo, data.unidad);
	const [insumo] = await db
		.update(insumos)
		.set({ ...data, ...catalogo, updated_at: new Date() })
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
		const catalogo = await resolverCatalogos(fila.tipo, fila.unidad);
		await db
			.insert(insumos)
			.values({ ...fila, ...catalogo, created_at: new Date(), updated_at: new Date() })
			.onConflictDoUpdate({
				target: insumos.codigo,
				set: {
					nombre: fila.nombre,
					tipo: catalogo.tipo,
					unidad: catalogo.unidad,
					tipo_id: catalogo.tipo_id,
					unidad_id: catalogo.unidad_id,
					costo_unitario: fila.costo_unitario,
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
