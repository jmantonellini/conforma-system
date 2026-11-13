import { sql } from 'drizzle-orm';
import { MONEDAS } from '$lib/utils/moneda';
import { integer, numeric, pgPolicy, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true, mode: 'date' });
export const creado = () => fecha('created_at').defaultNow();
export const actualizado = () => fecha('updated_at').$onUpdate(() => new Date());

export const importe = (nombre: string) =>
	numeric(nombre, { precision: 14, scale: 2, mode: 'number' });
export const precioUnitario = (nombre: string) =>
	numeric(nombre, { precision: 14, scale: 4, mode: 'number' });
export const porcentaje = (nombre: string) =>
	numeric(nombre, { precision: 7, scale: 4, mode: 'number' });
export const cantidad = (nombre: string) =>
	numeric(nombre, { precision: 14, scale: 4, mode: 'number' });
export const tipoCambio = (nombre: string) =>
	numeric(nombre, { precision: 14, scale: 4, mode: 'number' });

export const moneda = () => text('moneda', { enum: MONEDAS }).notNull().default('USD');

export const empresas = pgTable('empresas', {
	id: serial('id').primaryKey(),
	razon_social: text('razon_social').notNull(),
	cuit: text('cuit').unique(),
	direccion: text('direccion'),
	telefono: text('telefono'),
	email: text('email'),
	logo_url: text('logo_url'),
	created_at: creado(),
	updated_at: actualizado()
});

export const empresaActual = sql`empresa_actual()`;

export const empresa = () =>
	integer('empresa_id')
		.notNull()
		.default(empresaActual)
		.references(() => empresas.id, { onDelete: 'restrict' });

export const aislamiento = () =>
	pgPolicy('aislamiento_empresa', {
		for: 'all',
		using: sql`empresa_id = empresa_actual()`,
		withCheck: sql`empresa_id = empresa_actual()`
	});
