import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { actualizado, aislamiento, creado, empresa } from './base';
import { usuarios } from './acceso';
import { contactos } from './contactos';
import { unidades_fabricacion } from './fabricacion';
import { lineas_pedido } from './pedidos';
import { productos } from './productos';

export const ubicaciones_stock = pgTable(
	'ubicaciones_stock',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		tipo: text('tipo', { enum: ['deposito', 'distribuidor'] }).notNull(),
		nombre: text('nombre').notNull(),
		contacto_distribuidor_id: integer('contacto_distribuidor_id').references(() => contactos.id, {
			onDelete: 'restrict'
		}),
		activo: boolean('activo').notNull().default(true),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_ubicaciones_stock_distribuidor')
			.on(t.contacto_distribuidor_id)
			.where(sql`${t.contacto_distribuidor_id} IS NOT NULL`),
		uniqueIndex('idx_ubicaciones_stock_deposito')
			.on(t.empresa_id, t.tipo)
			.where(sql`${t.tipo} = 'deposito'`),
		check(
			'ubicaciones_stock_tipo_propietario',
			sql`(${t.tipo} = 'deposito' AND ${t.contacto_distribuidor_id} IS NULL) OR (${t.tipo} = 'distribuidor' AND ${t.contacto_distribuidor_id} IS NOT NULL)`
		),
		aislamiento()
	]
);

export const reservas_stock = pgTable(
	'reservas_stock',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		linea_pedido_id: integer('linea_pedido_id')
			.references(() => lineas_pedido.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		ubicacion_stock_id: integer('ubicacion_stock_id')
			.references(() => ubicaciones_stock.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: integer('cantidad').notNull(),
		estado: text('estado', { enum: ['reservada', 'consumida', 'liberada'] })
			.notNull()
			.default('reservada'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		check('reservas_stock_cantidad_positiva', sql`${t.cantidad} > 0`),
		index('idx_reservas_stock_ubicacion_estado').on(t.ubicacion_stock_id, t.estado),
		aislamiento()
	]
);

export const TIPOS_MOVIMIENTO_STOCK_DB = [
	'produccion',
	'ingreso',
	'transferencia',
	'venta_distribuidor',
	'devolucion',
	'ajuste_entrada',
	'ajuste_salida',
	'venta_pedido'
] as const;

export const movimientos_stock = pgTable(
	'movimientos_stock',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		producto_id: integer('producto_id')
			.references(() => productos.id, { onDelete: 'restrict' })
			.notNull(),
		ubicacion_origen_id: integer('ubicacion_origen_id').references(() => ubicaciones_stock.id, {
			onDelete: 'restrict'
		}),
		ubicacion_destino_id: integer('ubicacion_destino_id').references(() => ubicaciones_stock.id, {
			onDelete: 'restrict'
		}),
		cantidad: integer('cantidad').notNull(),
		tipo: text('tipo', { enum: TIPOS_MOVIMIENTO_STOCK_DB }).notNull(),
		unidad_fabricacion_id: integer('unidad_fabricacion_id').references(
			() => unidades_fabricacion.id,
			{ onDelete: 'restrict' }
		),
		linea_pedido_id: integer('linea_pedido_id').references(() => lineas_pedido.id, {
			onDelete: 'restrict'
		}),
		usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
		observaciones: text('observaciones'),
		created_at: creado()
	},
	(t) => [
		check('movimientos_stock_cantidad_positiva', sql`${t.cantidad} > 0`),
		check(
			'movimientos_stock_ubicaciones_distintas',
			sql`${t.ubicacion_origen_id} IS NULL OR ${t.ubicacion_destino_id} IS NULL OR ${t.ubicacion_origen_id} <> ${t.ubicacion_destino_id}`
		),
		check(
			'movimientos_stock_requiere_ubicacion',
			sql`${t.ubicacion_origen_id} IS NOT NULL OR ${t.ubicacion_destino_id} IS NOT NULL`
		),
		uniqueIndex('idx_movimientos_stock_unidad').on(t.unidad_fabricacion_id),
		uniqueIndex('idx_movimientos_stock_linea_pedido_tipo')
			.on(t.linea_pedido_id, t.tipo)
			.where(sql`${t.linea_pedido_id} IS NOT NULL`),
		index('idx_movimientos_stock_producto').on(t.producto_id),
		index('idx_movimientos_stock_origen').on(t.ubicacion_origen_id),
		index('idx_movimientos_stock_destino').on(t.ubicacion_destino_id),
		aislamiento()
	]
);
