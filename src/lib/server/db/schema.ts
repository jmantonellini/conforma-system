import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tabla de permisos
export const permisos = sqliteTable('permisos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique()
});

// Tabla de usuarios (auth propia)
export const usuarios = sqliteTable('usuarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

// Tabla de empleados
export const empleados = sqliteTable('empleados', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	apellido: text('apellido').notNull(),
	rol: text('rol').notNull(), // admin, jefePlanta, operario, oficina
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

// Tabla de sesiones
export const sesiones = sqliteTable('sesiones', {
	id: text('id').primaryKey(),
	user_id: integer('user_id').references(() => usuarios.id),
	expires_at: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Tabla de pedidos (la de tu app)
export const ordenes = sqliteTable('ordenes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	numero_orden: text('numero_orden').notNull().unique(),
	cliente_nombre: text('cliente_nombre').notNull(),
	tipo: text('tipo'), // escape, baranda, etc
	fecha_pedido: integer('fecha_pedido', { mode: 'timestamp' }).notNull(),
	fecha_entrega_prometida: integer('fecha_entrega_prometida', { mode: 'timestamp' }),
	estado: text('estado').notNull().default('en_espera_seña'),
	precio: real('precio')
});

export type Usuario = typeof usuarios.$inferSelect;
export type Sesion = typeof sesiones.$inferSelect;
export type Orden = typeof ordenes.$inferSelect;