import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { aislamiento, creado, empresa } from './base';
import { cotizaciones } from './cotizaciones';
import { ordenes_fabricacion } from './fabricacion';
import { pedidos } from './pedidos';
import { productos } from './productos';

export const CATEGORIAS_ADJUNTO = ['general', 'plano', 'portada'] as const;

export const adjuntos = pgTable(
	'adjuntos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		cotizacion_id: integer('cotizacion_id').references(() => cotizaciones.id, {
			onDelete: 'cascade'
		}),
		pedido_id: integer('pedido_id').references(() => pedidos.id, { onDelete: 'cascade' }),
		orden_fabricacion_id: integer('orden_fabricacion_id').references(() => ordenes_fabricacion.id, {
			onDelete: 'cascade'
		}),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'cascade' }),
		nombre_original: text('nombre_original').notNull(),
		archivo_key: text('archivo_key').notNull(),
		mime_type: text('mime_type'),
		categoria: text('categoria', { enum: CATEGORIAS_ADJUNTO }).notNull().default('general'),
		tamano_bytes: integer('tamano_bytes'),
		created_at: creado()
	},
	(t) => [
		index('idx_adjuntos_owner_cotizacion').on(t.cotizacion_id),
		index('idx_adjuntos_owner_pedido').on(t.pedido_id),
		index('idx_adjuntos_owner_fabricacion').on(t.orden_fabricacion_id),
		index('idx_adjuntos_owner_producto').on(t.producto_id),
		uniqueIndex('idx_adjuntos_portada_producto')
			.on(t.producto_id)
			.where(sql`${t.categoria} = 'portada'`),
		check(
			'adjuntos_un_solo_propietario',
			sql`num_nonnulls(cotizacion_id, pedido_id, orden_fabricacion_id, producto_id) = 1`
		),
		aislamiento()
	]
);
