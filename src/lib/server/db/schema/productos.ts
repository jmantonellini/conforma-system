import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { TIPOS_ATRIBUTO, type ValoresAtributos } from '$lib/modulos/productos/atributos';
import { actualizado, aislamiento, cantidad, creado, empresa, porcentaje } from './base';
import { insumos } from './insumos';

export const categorias_productos = pgTable(
	'categorias_productos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		slug: text('slug').notNull(),
		descripcion: text('descripcion'),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_categorias_productos_empresa_nombre').on(t.empresa_id, t.nombre),
		uniqueIndex('idx_categorias_productos_empresa_slug').on(t.empresa_id, t.slug),
		aislamiento()
	]
);

export const atributos_categoria = pgTable(
	'atributos_categoria',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		categoria_id: integer('categoria_id')
			.references(() => categorias_productos.id, { onDelete: 'cascade' })
			.notNull(),
		clave: text('clave').notNull(),
		etiqueta: text('etiqueta').notNull(),
		grupo: text('grupo'),
		tipo: text('tipo', { enum: TIPOS_ATRIBUTO }).notNull().default('numero'),
		unidad: text('unidad'),
		orden: integer('orden').notNull().default(0),
		created_at: creado()
	},
	(t) => [uniqueIndex('idx_atributos_categoria_clave').on(t.categoria_id, t.clave), aislamiento()]
);

export const tipos_vehiculo = pgTable(
	'tipos_vehiculo',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		slug: text('slug').notNull(),
		activo: boolean('activo').default(true)
	},
	(t) => [uniqueIndex('idx_tipos_vehiculo_empresa_slug').on(t.empresa_id, t.slug), aislamiento()]
);

export const marcas = pgTable(
	'marcas',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		logo_url: text('logo_url'),
		activo: boolean('activo').default(true)
	},
	(t) => [uniqueIndex('idx_marcas_empresa_nombre').on(t.empresa_id, t.nombre), aislamiento()]
);

export const modelos = pgTable(
	'modelos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		marca_id: integer('marca_id')
			.references(() => marcas.id, { onDelete: 'restrict' })
			.notNull(),
		tipo_vehiculo_id: integer('tipo_vehiculo_id')
			.references(() => tipos_vehiculo.id, { onDelete: 'restrict' })
			.notNull(),
		nombre: text('nombre').notNull(),
		anio_desde: integer('anio_desde'),
		anio_hasta: integer('anio_hasta'),
		activo: boolean('activo').default(true)
	},
	() => [aislamiento()]
);

export const tipos_uso = pgTable(
	'tipos_uso',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		slug: text('slug').notNull()
	},
	(t) => [uniqueIndex('idx_tipos_uso_empresa_slug').on(t.empresa_id, t.slug), aislamiento()]
);

export const categorias_competencia = pgTable(
	'categorias_competencia',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion'),
		tipo_vehiculo_id: integer('tipo_vehiculo_id')
			.references(() => tipos_vehiculo.id)
			.notNull(),
		activa_desde: integer('activa_desde'),
		activa_hasta: integer('activa_hasta'),
		vigente: boolean('vigente').default(true)
	},
	() => [aislamiento()]
);

export const productos = pgTable(
	'productos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		codigo: text('codigo').notNull(),
		nombre: text('nombre').notNull(),
		categoria_id: integer('categoria_id').references(() => categorias_productos.id, {
			onDelete: 'set null'
		}),
		atributos: jsonb('atributos').$type<ValoresAtributos>().notNull().default({}),
		notas_fabricacion: text('notas_fabricacion'),
		tipo_vehiculo_id: integer('tipo_vehiculo_id').references(() => tipos_vehiculo.id),
		marca_id: integer('marca_id').references(() => marcas.id),
		modelo_id: integer('modelo_id').references(() => modelos.id),
		tipo_uso_id: integer('tipo_uso_id').references(() => tipos_uso.id),
		categoria_competencia_id: integer('categoria_competencia_id').references(
			() => categorias_competencia.id
		),
		margen_porcentaje: porcentaje('margen_porcentaje').notNull().default(0),
		es_personalizable: boolean('es_personalizable').default(true),
		activo: boolean('activo').default(true),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		uniqueIndex('idx_productos_empresa_codigo').on(t.empresa_id, t.codigo),
		check(
			'productos_margen_porcentaje_range',
			sql`${t.margen_porcentaje} >= 0 AND ${t.margen_porcentaje} < 100`
		),
		aislamiento()
	]
);

export const producto_insumos = pgTable(
	'producto_insumos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		producto_id: integer('producto_id')
			.references(() => productos.id, { onDelete: 'cascade' })
			.notNull(),
		insumo_id: integer('insumo_id')
			.references(() => insumos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: cantidad('cantidad').notNull().default(1),
		orden: integer('orden').notNull().default(0),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [index('idx_producto_insumos_producto').on(t.producto_id), aislamiento()]
);

export const producto_componentes = pgTable(
	'producto_componentes',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		producto_id: integer('producto_id')
			.references(() => productos.id, { onDelete: 'cascade' })
			.notNull(),
		componente_id: integer('componente_id')
			.references(() => productos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: cantidad('cantidad').notNull().default(1),
		orden: integer('orden').notNull().default(0),
		created_at: creado()
	},
	(t) => [index('idx_producto_componentes_producto').on(t.producto_id), aislamiento()]
);
