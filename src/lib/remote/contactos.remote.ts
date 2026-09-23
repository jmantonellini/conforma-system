import * as v from 'valibot';
import { command, form, query } from '$app/server';
import { and, asc, count, desc, eq, exists, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contactos, proveedores, pedidos, estados_pedido } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';

const ContactoBaseSchema = {
	razon_social: v.pipe(v.string(), v.nonEmpty('La razón social es requerida')),
	nombre: v.optional(v.string()),
	apellido: v.optional(v.string()),
	cuit: v.optional(v.string()),
	email: v.optional(v.string()),
	telefono: v.optional(v.string())
};

const seleccionContactoBase = {
	id: contactos.id,
	razon_social: contactos.razon_social,
	cuit: contactos.cuit,
	email: contactos.email,
	telefono: contactos.telefono,
	pais: contactos.pais,
	provincia: contactos.provincia,
	ciudad: contactos.ciudad,
	codigo_postal: contactos.codigo_postal,
	calle: contactos.calle,
	numero: contactos.numero,
	piso: contactos.piso,
	departamento: contactos.departamento,
	activo: contactos.activo,
	created_at: contactos.created_at,
	updated_at: contactos.updated_at,
	es_cliente: contactos.es_cliente,
	es_distribuidor: contactos.es_distribuidor,
	nombre: contactos.nombre,
	apellido: contactos.apellido,
	porcentaje_compensacion: contactos.porcentaje_compensacion,
	saldo_disponible: contactos.saldo_disponible,
	es_proveedor: exists(
		db
			.select({ id: proveedores.id })
			.from(proveedores)
			.where(eq(proveedores.contacto_id, contactos.id))
	)
};

const esContactoCliente = (empresa: { es_cliente?: boolean; es_distribuidor?: boolean }) =>
	Boolean(empresa.es_cliente || empresa.es_distribuidor);

const construirCondicionContactoBase = ({
	search,
	rol = 'todos',
	incluirClientes = true
}: {
	search?: string;
	rol?: 'todos' | 'cliente' | 'proveedor' | 'ambos';
	incluirClientes?: boolean;
} = {}) => {
	const condiciones: any[] = [eq(contactos.activo, true)];

	if (search?.trim()) {
		const patron = `%${search.trim()}%`;
		condiciones.push(
			sql<boolean>`(
				${contactos.razon_social} ILIKE ${patron}
				OR ${contactos.cuit} ILIKE ${patron}
				OR ${contactos.email} ILIKE ${patron}
			)`
		);
	}

	if (incluirClientes && (rol === 'cliente' || rol === 'ambos')) {
		condiciones.push(or(eq(contactos.es_cliente, true), eq(contactos.es_distribuidor, true)));
	}

	if (rol === 'proveedor' || rol === 'ambos') {
		condiciones.push(
			exists(
				db
					.select({ id: proveedores.id })
					.from(proveedores)
					.where(eq(proveedores.contacto_id, contactos.id))
			)
		);
	}

	return condiciones.length > 1 ? and(...condiciones) : condiciones[0];
};

const ContactoSchema = v.object({
	...ContactoBaseSchema,
	rol: v.optional(v.picklist(['ninguno', 'cliente', 'proveedor', 'ambos']), 'ninguno'),
	es_distribuidor: v.optional(v.boolean(), false),
	porcentaje_compensacion: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 0),
	saldo_disponible: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
	codigo: v.optional(v.string()),
	contacto_nombre: v.optional(v.string()),
	contacto_email: v.optional(v.string()),
	contacto_telefono: v.optional(v.string()),
	condiciones_pago: v.optional(v.string()),
	pais: v.optional(v.string()),
	provincia: v.optional(v.string()),
	ciudad: v.optional(v.string()),
	codigo_postal: v.optional(v.string()),
	calle: v.optional(v.string()),
	numero: v.optional(v.string()),
	piso: v.optional(v.string()),
	departamento: v.optional(v.string())
});

const ProveedorSchema = v.object({
	contacto_id: v.pipe(v.string(), v.transform(Number), v.number()),
	codigo: v.optional(v.string()),
	contacto_nombre: v.optional(v.string()),
	contacto_email: v.optional(v.string()),
	contacto_telefono: v.optional(v.string()),
	condiciones_pago: v.optional(v.string())
});

const ContactoUpdateSchema = v.object({
	...ContactoBaseSchema,
	rol: v.optional(v.picklist(['ninguno', 'cliente', 'proveedor', 'ambos']), 'ninguno'),
	es_cliente: v.optional(v.boolean()),
	es_distribuidor: v.optional(v.boolean(), false),
	pais: v.optional(v.string()),
	provincia: v.optional(v.string()),
	ciudad: v.optional(v.string()),
	codigo_postal: v.optional(v.string()),
	calle: v.optional(v.string()),
	numero: v.optional(v.string()),
	piso: v.optional(v.string()),
	departamento: v.optional(v.string()),
	porcentaje_compensacion: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 0),
	codigo: v.optional(v.string()),
	contacto_nombre: v.optional(v.string()),
	contacto_email: v.optional(v.string()),
	contacto_telefono: v.optional(v.string()),
	condiciones_pago: v.optional(v.string()),
	saldo_disponible: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
	id: v.string()
});
const ProveedorUpdateSchema = v.object({ ...ProveedorSchema.entries, id: v.string() });

const ImportarContactosSchema = v.pipe(
	v.array(
		v.object({
			razon_social: v.pipe(v.string(), v.nonEmpty('Razón social requerida')),
			nombre: v.optional(v.string()),
			apellido: v.optional(v.string()),
			cuit: v.optional(v.string()),
			email: v.optional(v.string()),
			telefono: v.optional(v.string()),
			rol: v.optional(v.picklist(['ninguno', 'cliente', 'proveedor', 'ambos']), 'ninguno'),
			es_distribuidor: v.optional(v.boolean(), false),
			porcentaje_compensacion: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 0),
			saldo_disponible: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
			codigo_proveedor: v.optional(v.string()),
			contacto_proveedor: v.optional(v.string()),
			condiciones_pago: v.optional(v.string())
		})
	),
	v.maxLength(1000, 'El archivo no puede superar 1000 filas')
);

export const obtenerContactos = query(
	v.object({
		search: v.optional(v.string()),
		rol: v.optional(v.picklist(['todos', 'cliente', 'proveedor', 'ambos']), 'todos'),
		sort: v.optional(v.picklist(['razon_social', 'cuit', 'email', 'created_at']), 'razon_social'),
		direction: v.optional(v.picklist(['asc', 'desc']), 'asc'),
		page: v.optional(v.pipe(v.number(), v.toMinValue(1)), 1),
		limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)), 20)
	}),
	async ({
		search,
		rol = 'todos',
		sort = 'razon_social',
		direction = 'asc',
		page = 1,
		limit = 20
	}) => {
		const where = construirCondicionContactoBase({ search, rol });
		const seleccion = seleccionContactoBase;
		const columnaOrden = {
			razon_social: contactos.razon_social,
			cuit: contactos.cuit,
			email: contactos.email,
			created_at: contactos.created_at
		}[sort];
		const orden = direction === 'desc' ? desc(columnaOrden) : asc(columnaOrden);
		const [data, [{ total }]] = await Promise.all([
			db
				.select(seleccion)
				.from(contactos)
				.where(where)
				.orderBy(orden)
				.limit(limit)
				.offset((page - 1) * limit),
			db.select({ total: count() }).from(contactos).where(where)
		]);
		return { data, total, totalPages: Math.ceil(total / limit), currentPage: page };
	}
);

export const obtenerContactosCliente = query(
	v.object({
		search: v.optional(v.string()),
		limit: v.optional(v.number(), 100)
	}),
	async ({ search, limit }) => {
		const condicionBase = construirCondicionContactoBase({ search, rol: 'cliente' });
		const datos = await db
			.select()
			.from(contactos)
			.where(condicionBase)
			.orderBy(contactos.razon_social)
			.limit(limit);
		const [{ total }] = await db.select({ total: count() }).from(contactos).where(condicionBase);
		return { data: datos, total };
	}
);

export const obtenerProveedores = query(async () =>
	db
		.select({
			id: proveedores.id,
			codigo: proveedores.codigo,
			contacto_nombre: proveedores.contacto_nombre,
			contacto_email: proveedores.contacto_email,
			contacto_telefono: proveedores.contacto_telefono,
			condiciones_pago: proveedores.condiciones_pago,
			activo: proveedores.activo,
			contacto_id: contactos.id,
			empresa: contactos.razon_social,
			cuit: contactos.cuit
		})
		.from(proveedores)
		.innerJoin(contactos, eq(proveedores.contacto_id, contactos.id))
		.orderBy(asc(contactos.razon_social))
);

export const crearContacto = form(ContactoSchema, async (data) => {
	const {
		rol,
		es_distribuidor,
		codigo,
		contacto_nombre,
		contacto_email,
		contacto_telefono,
		condiciones_pago,
		...empresaData
	} = data;
	const empresa = await db.transaction(async (tx) => {
		const [nuevaEmpresa] = await tx
			.insert(contactos)
			.values({
				...empresaData,
				nombre: data.nombre || null,
				apellido: data.apellido || null,
				es_distribuidor: Boolean(es_distribuidor)
			})
			.returning();

		const esCliente = rol === 'cliente' || rol === 'ambos' || Boolean(es_distribuidor);
		if (esCliente) {
			await tx
				.update(contactos)
				.set({
					es_cliente: true,
					es_distribuidor: Boolean(es_distribuidor)
				})
				.where(eq(contactos.id, nuevaEmpresa.id));
		}

		if (rol === 'proveedor' || rol === 'ambos') {
			await tx.insert(proveedores).values({
				contacto_id: nuevaEmpresa.id,
				codigo,
				contacto_nombre,
				contacto_email,
				contacto_telefono,
				condiciones_pago
			});
		}

		return nuevaEmpresa;
	});
	obtenerContactos({}).refresh();
	obtenerProveedores().refresh();
	return empresa;
});

export const crearProveedor = form(ProveedorSchema, async (data) => {
	const [proveedor] = await db.insert(proveedores).values(data).returning();
	obtenerProveedores().refresh();
	return proveedor;
});

export const importarContactos = command(ImportarContactosSchema, async (filas) => {
	await requirePermission('contactos', 'create');
	await db.transaction(async (tx) => {
		for (const fila of filas) {
			const esCliente = fila.rol === 'cliente' || fila.rol === 'ambos' || fila.es_distribuidor;
			const valores = {
				razon_social: fila.razon_social,
				nombre: fila.nombre || null,
				apellido: fila.apellido || null,
				cuit: fila.cuit || null,
				email: fila.email || null,
				telefono: fila.telefono || null,
				es_cliente: esCliente,
				es_distribuidor: fila.es_distribuidor,
				porcentaje_compensacion: fila.porcentaje_compensacion,
				saldo_disponible: fila.saldo_disponible,
				activo: true,
				updated_at: new Date()
			};
			const existente = fila.cuit
				? await tx
						.select({ id: contactos.id })
						.from(contactos)
						.where(eq(contactos.cuit, fila.cuit))
						.limit(1)
				: [];
			const [contacto] = existente.length
				? await tx
						.update(contactos)
						.set(valores)
						.where(eq(contactos.id, existente[0].id))
						.returning()
				: await tx
						.insert(contactos)
						.values({ ...valores, created_at: new Date() })
						.returning();

			if (fila.rol === 'proveedor' || fila.rol === 'ambos') {
				const proveedor = await tx
					.select({ id: proveedores.id })
					.from(proveedores)
					.where(eq(proveedores.contacto_id, contacto.id))
					.limit(1);
				const proveedorData = {
					codigo: fila.codigo_proveedor || null,
					contacto_nombre: fila.contacto_proveedor || null,
					condiciones_pago: fila.condiciones_pago || null,
					updated_at: new Date()
				};
				if (proveedor.length) {
					await tx
						.update(proveedores)
						.set(proveedorData)
						.where(eq(proveedores.id, proveedor[0].id));
				} else {
					await tx.insert(proveedores).values({ contacto_id: contacto.id, ...proveedorData });
				}
			}
		}
	});
	obtenerContactos({}).refresh();
	obtenerContactosCliente({}).refresh();
	obtenerProveedores().refresh();
	return { success: true, cantidad: filas.length };
});

export const actualizarContacto = form(
	ContactoUpdateSchema,
	async ({
		id,
		rol,
		codigo,
		contacto_nombre,
		contacto_email,
		contacto_telefono,
		condiciones_pago,
		...data
	}) => {
		await requirePermission('contactos', 'edit');
		const contactoId = Number(id);
		const [existente] = await db
			.select({ es_cliente: contactos.es_cliente, es_distribuidor: contactos.es_distribuidor })
			.from(contactos)
			.where(eq(contactos.id, contactoId))
			.limit(1);
		const esProveedor = rol === 'proveedor' || rol === 'ambos';
		const esCliente = rol
			? rol === 'cliente' || rol === 'ambos' || Boolean(data.es_distribuidor)
			: (data.es_cliente ?? (esContactoCliente(data) || Boolean(existente?.es_cliente)));
		const actualizado = await db.transaction(async (tx) => {
			const [contacto] = await tx
				.update(contactos)
				.set({
					...data,
					es_cliente: esCliente,
					es_distribuidor: Boolean(data.es_distribuidor),
					updated_at: new Date()
				})
				.where(eq(contactos.id, contactoId))
				.returning();

			const proveedorData = {
				codigo: codigo || null,
				contacto_nombre: contacto_nombre || null,
				contacto_email: contacto_email || null,
				contacto_telefono: contacto_telefono || null,
				condiciones_pago: condiciones_pago || null,
				updated_at: new Date()
			};
			const [proveedor] = await tx
				.select({ id: proveedores.id })
				.from(proveedores)
				.where(eq(proveedores.contacto_id, contactoId))
				.limit(1);
			if (esProveedor) {
				if (proveedor)
					await tx.update(proveedores).set(proveedorData).where(eq(proveedores.id, proveedor.id));
				else await tx.insert(proveedores).values({ contacto_id: contactoId, ...proveedorData });
			} else if (proveedor) {
				await tx.delete(proveedores).where(eq(proveedores.id, proveedor.id));
			}
			return contacto;
		});
		obtenerContactos({}).refresh();
		obtenerContactosCliente({}).refresh();
		obtenerProveedores().refresh();
		return actualizado;
	}
);

export const eliminarContacto = command(v.number(), async (id) => {
	await requirePermission('contactos', 'delete');
	await db
		.update(contactos)
		.set({ activo: false, updated_at: new Date() })
		.where(eq(contactos.id, id));
	obtenerContactos({
		search: '',
		rol: 'todos',
		page: 1,
		sort: 'razon_social',
		direction: 'asc'
	}).refresh();
	obtenerContactosCliente({}).refresh();
	return { success: true };
});

export const actualizarProveedor = form(ProveedorUpdateSchema, async ({ id, ...data }) => {
	const [proveedor] = await db
		.update(proveedores)
		.set({ ...data, updated_at: new Date() })
		.where(eq(proveedores.id, Number(id)))
		.returning();
	obtenerProveedores().refresh();
	return proveedor;
});

export const obtenerContactoPorId = query(v.number(), async (id) => {
	const [contacto] = await db.select().from(contactos).where(eq(contactos.id, id)).limit(1);
	if (!contacto) throw new Error('Contacto no encontrado');
	const [proveedor] = await db
		.select()
		.from(proveedores)
		.where(eq(proveedores.contacto_id, id))
		.limit(1);
	return { ...contacto, proveedor: proveedor ?? null };
});

export const obtenerPedidosContacto = query(v.number(), async (contactoId) =>
	db
		.select({
			id: pedidos.id,
			numero_pedido: pedidos.numero_pedido,
			fecha_pedido: pedidos.fecha_pedido,
			precio_total: pedidos.precio_total,
			estado: estados_pedido.nombre,
			estado_color: estados_pedido.color
		})
		.from(pedidos)
		.leftJoin(estados_pedido, eq(pedidos.estado_id, estados_pedido.id))
		.where(eq(pedidos.contacto_id, contactoId))
		.orderBy(sql`${pedidos.fecha_pedido} DESC`)
);

export const obtenerProveedorPorId = query(v.number(), async (id) => {
	const [proveedor] = await db.select().from(proveedores).where(eq(proveedores.id, id)).limit(1);
	if (!proveedor) throw new Error('Proveedor no encontrado');
	return proveedor;
});
