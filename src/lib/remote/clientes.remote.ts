import { z } from 'zod';
import { query, command, getRequestEvent, form } from '$app/server';
import { getDb } from '$lib/server/db';
import { clientes } from '$lib/server/db/schema';
import { eq, ilike, count, and } from 'drizzle-orm';

// Schema de validación
const ClienteSchemaBase = z.object({
	nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
	razon_social: z.string().optional(),
	cuit: z.string().optional(),
	email: z.email('Email inválido').optional(),
	telefono: z.string().optional(),
	pais: z.string().default('Argentina'),
	provincia: z.string().optional(),
	ciudad: z.string().optional(),
	codigo_postal: z.string().optional(),
	calle: z.string().optional(),
	numero: z.string().optional(),
	piso: z.string().optional(),
	departamento: z.string().optional()
});

// Query: Obtener todos los clientes (con paginación y búsqueda)
export const getClientes = query(
	z.object({
		search: z.string().optional(),
		page: z.number().min(1).default(1).optional(),
		limit: z.number().min(1).max(100).default(10).optional()
	}),
	async ({ search, page = 1, limit = 10 }) => {
		const db = getDb(getRequestEvent().platform?.env?.DB);

		const offset = (page - 1) * limit;

		// Construir condición de búsqueda
		const whereCondition = search
			? and(ilike(clientes.nombre, `%${search}%`), ilike(clientes.razon_social, `%${search}%`))
			: undefined;

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
export const getClienteById = query(z.object({ id: z.number().optional() }), async ({ id }) => {
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

	console.log('CLIENTE', cliente);

	return { success: true, cliente };
});

const ClienteSchemaUpdate = ClienteSchemaBase.extend({
	id: z.string()
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
export const deleteCliente = command(z.object({ id: z.number() }), async (data) => {
	const db = getDb(getRequestEvent().platform?.env?.DB);

	await db.delete(clientes).where(eq(clientes.id, data.id));

	return { success: true };
});
