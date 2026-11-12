import { boolean, index, integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { EstadosTarea, Prioridades } from '$lib/modulos/tareas/tipos';
import { actualizado, aislamiento, creado, empresa, fecha } from './base';
import { empleados, usuarios } from './acceso';

export const MODULOS_NOTIFICACION = [
	'cotizacion',
	'pedido',
	'fabricacion',
	'tarea',
	'envio'
] as const;

export const tareas = pgTable(
	'tareas',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		titulo: text('titulo').notNull(),
		descripcion: text('descripcion'),
		estado: text('estado', {
			enum: [EstadosTarea.PENDIENTE, EstadosTarea.EN_PROGRESO, EstadosTarea.COMPLETADA]
		})
			.notNull()
			.default(EstadosTarea.PENDIENTE),
		archivada: boolean('archivada').notNull().default(false),
		orden: integer('orden').default(0),
		prioridad: text('prioridad', { enum: [Prioridades.BAJA, Prioridades.MEDIA, Prioridades.ALTA] })
			.notNull()
			.default(Prioridades.MEDIA),
		fecha_entrega: fecha('fecha_entrega'),
		asignado_a: integer('asignado_a').references(() => empleados.id, { onDelete: 'set null' }),
		creada_por: integer('creada_por').references(() => usuarios.id, { onDelete: 'set null' }),
		completada_at: fecha('completada_at'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [index('idx_tareas_estado').on(t.empresa_id, t.archivada, t.estado), aislamiento()]
);

export const notificaciones = pgTable(
	'notificaciones',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		usuario_id: integer('usuario_id')
			.references(() => usuarios.id, { onDelete: 'cascade' })
			.notNull(),
		modulo: text('modulo', { enum: MODULOS_NOTIFICACION }),
		titulo: text('titulo').notNull(),
		mensaje: text('mensaje'),
		link: text('link'),
		leida: boolean('leida').default(false),
		created_at: creado()
	},
	(t) => [index('idx_notificaciones_usuario').on(t.usuario_id, t.leida), aislamiento()]
);

export const feedback = pgTable(
	'feedback',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		mensaje: text('mensaje').notNull(),
		created_at: creado()
	},
	() => [aislamiento()]
);

export const logs_sistema = pgTable(
	'logs_sistema',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
		accion: text('accion').notNull(),
		detalles: text('detalles'),
		ip_address: text('ip_address'),
		created_at: creado()
	},
	() => [aislamiento()]
);
