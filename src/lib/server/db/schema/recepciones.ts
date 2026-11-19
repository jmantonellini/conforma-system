import { sql } from 'drizzle-orm';
import { check, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { actualizado, aislamiento, creado, empresa, fecha } from './base';
import { usuarios } from './acceso';
import { cotizaciones } from './cotizaciones';
import { pedidos } from './pedidos';

export const recepciones_pieza = pgTable(
	'recepciones_pieza',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		cotizacion_id: integer('cotizacion_id').references(() => cotizaciones.id, {
			onDelete: 'cascade'
		}),
		pedido_id: integer('pedido_id').references(() => pedidos.id, { onDelete: 'cascade' }),
		fecha_recepcion: fecha('fecha_recepcion').notNull().defaultNow(),
		recibido_por: integer('recibido_por').references(() => usuarios.id, { onDelete: 'set null' }),
		llego_por: text('llego_por'),
		numero_guia: text('numero_guia'),
		estado_pieza: text('estado_pieza').notNull(),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		uniqueIndex('idx_recepciones_cotizacion').on(t.cotizacion_id),
		uniqueIndex('idx_recepciones_pedido').on(t.pedido_id),
		check('recepciones_un_solo_propietario', sql`num_nonnulls(cotizacion_id, pedido_id) = 1`),
		aislamiento()
	]
);
