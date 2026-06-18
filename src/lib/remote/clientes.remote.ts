import { query, command, getRequestEvent, form } from '$app/server';
import { getDb } from '$lib/server/db';
import { clientes } from '$lib/server/db/schema';
import { eq, count, or, like } from 'drizzle-orm';
import * as v from 'valibot';
import { ClienteSchemaBase } from './clientes.schema';

// Query: Obtener todos los clientes (con paginación y búsqueda)
export const getClientes = query(
	v.object({
		search: v.optional(v.string()),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.toMinValue(1), v.toMaxValue(100)), 10)
	}),
	async ({ search, page, limit }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const offset = (page - 1) * limit;

		let whereCondition = undefined;

		// Codicion de busqueda
		if (search && search.trim() !== '') {
			const searchTerm = `%${search}%`;
			whereCondition = or(
				like(clientes.nombre, searchTerm),
				like(clientes.razon_social, searchTerm),
				like(clientes.cuit, searchTerm)
			);
		}

		// Obtener datos paginados
		const data = await db
			.select()
			.from(clientes)
			.where(whereCondition)
			.orderBy(clientes.nombre)
			.limit(limit)
			.offset(offset);

		// Contar total
		const [totalResult] = await db.select({ count: count() }).from(clientes).where(whereCondition);

		const total = totalResult?.count || 0;

		return {
			data,
			total,
			totalPages: Math.ceil(total / limit),
			currentPage: page
		};
	}
);

// Query: Obtener un cliente por ID (para editar)
export const getClienteById = query(v.object({ id: v.optional(v.number()) }), async ({ id }) => {
	if (id == null) throw new Error('ID de cliente requerido');

	const db = getDb(getRequestEvent().platform?.env?.DB);

	const result = await db.select().from(clientes).where(eq(clientes.id, id)).get();

	if (!result) throw new Error('Cliente no encontrado');
	return result;
});

// Command: Crear cliente
export const createCliente = form(ClienteSchemaBase, async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const [cliente] = await db
		.insert(clientes)
		.values({
			...data,
			created_at: new Date(),
			updated_at: new Date()
		})
		.returning();

	getClientes({ search: '', page: 1 }).refresh();
	return { success: true, cliente };
});

const ClienteSchemaUpdate = v.object({
	...ClienteSchemaBase.entries,
	id: v.string()
});

// Command: Actualizar cliente
export const updateCliente = form(ClienteSchemaUpdate, async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	const { id, ...updateData } = data;
	const clienteId = parseInt(id);

	const [cliente] = await db
		.update(clientes)
		.set({
			...updateData,
			updated_at: new Date()
		})
		.where(eq(clientes.id, clienteId))
		.returning();

	return { success: true, cliente };
});

// Command: Eliminar cliente
export const deleteCliente = command(v.number(), async (id) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);
	await db.delete(clientes).where(eq(clientes.id, id));
	getClientes({ search: '', page: 1 }).refresh();
	return { success: true };
});
