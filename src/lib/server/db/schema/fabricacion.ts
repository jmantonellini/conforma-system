import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import {
	actualizado,
	aislamiento,
	cantidad,
	creado,
	empresa,
	fecha,
	importe,
	precioUnitario
} from './base';
import { empleados } from './acceso';
import { estados } from './estados';
import { lineas_pedido } from './pedidos';
import { productos } from './productos';

export const ordenes_fabricacion = pgTable(
	'ordenes_fabricacion',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		linea_pedido_id: integer('linea_pedido_id')
			.references(() => lineas_pedido.id, { onDelete: 'restrict' })
			.unique(),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'restrict' }),
		es_para_stock: boolean('es_para_stock').notNull().default(false),
		nombre_trabajo: text('nombre_trabajo').notNull(),
		cantidad_total: integer('cantidad_total').notNull().default(1),
		prioridad: integer('prioridad').default(0),
		fecha_inicio: fecha('fecha_inicio'),
		fecha_fin_estimada: fecha('fecha_fin_estimada'),
		fecha_fin_real: fecha('fecha_fin_real'),
		asignado_a: integer('asignado_a').references(() => empleados.id, { onDelete: 'set null' }),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		index('idx_ordenes_linea').on(t.linea_pedido_id),
		index('idx_ordenes_prioridad').on(t.prioridad),
		aislamiento()
	]
);

export const unidades_fabricacion = pgTable(
	'unidades_fabricacion',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		orden_fabricacion_id: integer('orden_fabricacion_id')
			.references(() => ordenes_fabricacion.id, { onDelete: 'cascade' })
			.notNull(),
		numero_serie: text('numero_serie').notNull(),
		estado_id: integer('estado_id')
			.references(() => estados.id, { onDelete: 'restrict' })
			.notNull(),
		comentario_estado: text('comentario_estado'),
		es_defectuoso: boolean('es_defectuoso').default(false),
		defecto_descripcion: text('defecto_descripcion'),
		foto_urls: text('foto_urls'),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		index('idx_unidades_orden').on(t.orden_fabricacion_id),
		index('idx_unidades_estado').on(t.estado_id),
		aislamiento()
	]
);

export const tipos_material = pgTable(
	'tipos_material',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		unidad_por_defecto: text('unidad'),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_tipos_material_empresa_nombre').on(t.empresa_id, t.nombre),
		aislamiento()
	]
);

export const materiales_empleados = pgTable(
	'materiales_empleados',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		orden_fabricacion_id: integer('orden_fabricacion_id')
			.references(() => ordenes_fabricacion.id, { onDelete: 'cascade' })
			.notNull(),
		tipo_id: integer('tipo_id')
			.references(() => tipos_material.id, { onDelete: 'restrict' })
			.notNull(),
		nombre: text('nombre').notNull(),
		cantidad: cantidad('cantidad').notNull(),
		unidad: text('unidad').notNull(),
		costo_unitario: precioUnitario('costo_unitario'),
		costo_total: importe('costo_total').generatedAlwaysAs(sql`cantidad * costo_unitario`),
		observaciones: text('observaciones'),
		created_at: creado()
	},
	() => [aislamiento()]
);
