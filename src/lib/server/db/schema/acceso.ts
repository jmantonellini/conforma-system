import {
	boolean,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { actualizado, aislamiento, creado, empresa, fecha } from './base';

export const roles = pgTable(
	'roles',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion'),
		created_at: creado()
	},
	(t) => [uniqueIndex('idx_roles_empresa_nombre').on(t.empresa_id, t.nombre), aislamiento()]
);

export const permisos = pgTable(
	'permisos',
	{
		id: serial('id').primaryKey(),
		accion: text('accion').notNull(),
		modulo: text('modulo').notNull(),
		created_at: creado()
	},
	(t) => [uniqueIndex('idx_permisos_modulo_accion').on(t.modulo, t.accion)]
);

export const roles_permisos = pgTable(
	'roles_permisos',
	{
		rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'cascade' }),
		permiso_id: integer('permiso_id').references(() => permisos.id, { onDelete: 'cascade' }),
		created_at: creado()
	},
	(t) => [primaryKey({ columns: [t.rol_id, t.permiso_id] })]
);

export const empleados = pgTable(
	'empleados',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		apellido: text('apellido').notNull(),
		email: text('email'),
		telefono: text('telefono'),
		dni: text('dni'),
		direccion: text('direccion'),
		fecha_ingreso: fecha('fecha_ingreso'),
		activo: boolean('activo').default(true),
		created_at: creado()
	},
	(t) => [
		uniqueIndex('idx_empleados_empresa_email').on(t.empresa_id, t.email),
		uniqueIndex('idx_empleados_empresa_dni').on(t.empresa_id, t.dni),
		aislamiento()
	]
);

export const usuarios = pgTable('usuarios', {
	id: serial('id').primaryKey(),
	empresa_id: empresa(),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'set null' }),
	empleado_id: integer('empleado_id')
		.references(() => empleados.id, { onDelete: 'set null' })
		.unique(),
	activo: boolean('activo').default(true),
	ultimo_acceso: fecha('ultimo_acceso'),
	created_at: creado(),
	updated_at: actualizado()
});

export const sesiones = pgTable('sesiones', {
	id: text('id').primaryKey(),
	user_id: integer('user_id').references(() => usuarios.id, { onDelete: 'cascade' }),
	expires_at: fecha('expires_at').notNull(),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	created_at: creado()
});
