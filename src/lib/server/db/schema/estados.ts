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
import { aislamiento, creado, empresa } from './base';
import { usuarios } from './acceso';

export const FLUJOS_ESTADO = ['cotizacion', 'pedido', 'fabricacion'] as const;
export type FlujoEstado = (typeof FLUJOS_ESTADO)[number];

export const estados = pgTable(
	'estados',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		flujo: text('flujo', { enum: FLUJOS_ESTADO }).notNull(),
		nombre: text('nombre').notNull(),
		slug: text('slug').notNull(),
		grupo: text('grupo').notNull(),
		orden: integer('orden').notNull(),
		color: text('color'),
		es_final: boolean('es_final').notNull().default(false),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_estados_flujo_slug').on(t.empresa_id, t.flujo, t.slug),
		uniqueIndex('idx_estados_flujo_nombre').on(t.empresa_id, t.flujo, t.nombre),
		aislamiento()
	]
);

export const transiciones_estado = pgTable(
	'transiciones_estado',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		estado_origen_id: integer('estado_origen_id')
			.references(() => estados.id, { onDelete: 'cascade' })
			.notNull(),
		estado_destino_id: integer('estado_destino_id')
			.references(() => estados.id, { onDelete: 'cascade' })
			.notNull(),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_transicion_unica').on(t.estado_origen_id, t.estado_destino_id),
		check('transiciones_estado_distintos', sql`${t.estado_origen_id} <> ${t.estado_destino_id}`),
		aislamiento()
	]
);

export const logs_cambios_estado = pgTable(
	'logs_cambios_estado',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		entidad_tipo: text('entidad_tipo', { enum: ['cotizacion', 'pedido', 'unidad'] }).notNull(),
		entidad_id: integer('entidad_id').notNull(),
		usuario_id: integer('usuario_id')
			.references(() => usuarios.id, { onDelete: 'set null' })
			.notNull(),
		estado_anterior_id: integer('estado_anterior_id'),
		estado_nuevo_id: integer('estado_nuevo_id'),
		comentario: text('comentario'),
		created_at: creado()
	},
	(t) => [
		index('idx_logs_entidad').on(t.entidad_tipo, t.entidad_id),
		index('idx_logs_usuario').on(t.usuario_id),
		aislamiento()
	]
);
