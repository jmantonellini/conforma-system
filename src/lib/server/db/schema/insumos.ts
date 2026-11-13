import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import {
	actualizado,
	aislamiento,
	cantidad,
	creado,
	empresa,
	porcentaje,
	precioUnitario
} from './base';
import { empleados, usuarios } from './acceso';
import { proveedores } from './contactos';
import { ordenes_fabricacion } from './fabricacion';

export const tipos_insumo = pgTable(
	'tipos_insumo',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		codigo: text('codigo').notNull(),
		nombre: text('nombre').notNull(),
		controla_stock: boolean('controla_stock').notNull().default(true),
		activo: boolean('activo').default(true),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_tipos_insumo_empresa_codigo').on(t.empresa_id, t.codigo),
		uniqueIndex('idx_tipos_insumo_empresa_nombre').on(t.empresa_id, t.nombre),
		aislamiento()
	]
);

export const unidades_medida = pgTable(
	'unidades_medida',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		codigo: text('codigo').notNull(),
		nombre: text('nombre').notNull(),
		dimension: text('dimension').notNull(),
		activo: boolean('activo').default(true),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_unidades_medida_empresa_codigo').on(t.empresa_id, t.codigo),
		uniqueIndex('idx_unidades_medida_empresa_nombre').on(t.empresa_id, t.nombre),
		aislamiento()
	]
);

export const categorias_insumos = pgTable(
	'categorias_insumos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion'),
		padre_id: integer('padre_id').references((): AnyPgColumn => categorias_insumos.id, {
			onDelete: 'set null'
		}),
		activo: boolean('activo').default(true),
		created_at: creado()
	},
	() => [aislamiento()]
);

export const insumos = pgTable(
	'insumos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		codigo: text('codigo').notNull(),
		nombre: text('nombre').notNull(),
		proveedor_id: integer('proveedor_id').references(() => proveedores.id, {
			onDelete: 'set null'
		}),
		tipo_id: integer('tipo_id').references(() => tipos_insumo.id, { onDelete: 'restrict' }),
		categoria_id: integer('categoria_id').references(() => categorias_insumos.id, {
			onDelete: 'set null'
		}),
		unidad_id: integer('unidad_id').references(() => unidades_medida.id, { onDelete: 'restrict' }),
		costo_unitario: precioUnitario('costo_unitario').notNull().default(0),
		flete_porcentaje: porcentaje('flete_porcentaje').notNull().default(0),
		imagen_key: text('imagen_key'),
		activo: boolean('activo').default(true),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [uniqueIndex('idx_insumos_empresa_codigo').on(t.empresa_id, t.codigo), aislamiento()]
);

export const lotes_consumo = pgTable(
	'lotes_consumo',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		empleado_id: integer('empleado_id')
			.references(() => empleados.id, { onDelete: 'restrict' })
			.notNull(),
		orden_fabricacion_id: integer('orden_fabricacion_id').references(() => ordenes_fabricacion.id, {
			onDelete: 'restrict'
		}),
		usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
		motivo: text('motivo').notNull(),
		created_at: creado()
	},
	(t) => [
		index('idx_lotes_consumo_orden').on(t.orden_fabricacion_id),
		index('idx_lotes_consumo_fecha').on(t.created_at),
		aislamiento()
	]
);

export const movimientos_insumos = pgTable(
	'movimientos_insumos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		insumo_id: integer('insumo_id')
			.references(() => insumos.id, { onDelete: 'restrict' })
			.notNull(),
		tipo: text('tipo', {
			enum: ['ingreso', 'consumo', 'ajuste_entrada', 'ajuste_salida']
		}).notNull(),
		fuente: text('fuente', { enum: ['manual', 'receta'] })
			.notNull()
			.default('manual'),
		cantidad: cantidad('cantidad').notNull(),
		orden_fabricacion_id: integer('orden_fabricacion_id').references(() => ordenes_fabricacion.id, {
			onDelete: 'restrict'
		}),
		empleado_id: integer('empleado_id')
			.references(() => empleados.id, { onDelete: 'restrict' })
			.notNull(),
		usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
		lote_id: integer('lote_id').references(() => lotes_consumo.id, { onDelete: 'restrict' }),
		motivo: text('motivo').notNull(),
		created_at: creado()
	},
	(t) => [
		index('idx_movimientos_insumos_lote').on(t.lote_id),
		check('movimientos_insumos_cantidad_positiva', sql`${t.cantidad} > 0`),
		check('movimientos_insumos_motivo_requerido', sql`length(trim(${t.motivo})) > 0`),
		check(
			'movimientos_insumos_fuente_receta_valida',
			sql`${t.fuente} <> 'receta' OR (${t.tipo} = 'consumo' AND ${t.orden_fabricacion_id} IS NOT NULL)`
		),
		uniqueIndex('idx_movimientos_insumos_receta_unica')
			.on(t.orden_fabricacion_id, t.insumo_id)
			.where(sql`${t.fuente} = 'receta'`),
		index('idx_movimientos_insumos_insumo_fecha').on(t.insumo_id, t.created_at),
		index('idx_movimientos_insumos_orden').on(t.orden_fabricacion_id),
		aislamiento()
	]
);

export const unidadInsumo = sql<string>`coalesce((select ${unidades_medida.codigo} from ${unidades_medida} where ${unidades_medida.id} = ${insumos.unidad_id}), 'unidad')`;
export const tipoInsumo = sql<string>`coalesce((select ${tipos_insumo.codigo} from ${tipos_insumo} where ${tipos_insumo.id} = ${insumos.tipo_id}), 'material')`;
export const controlaStockInsumo = sql<boolean>`coalesce((select ${tipos_insumo.controla_stock} from ${tipos_insumo} where ${tipos_insumo.id} = ${insumos.tipo_id}), true)`;
