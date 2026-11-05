import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contactos } from '$lib/server/db/schema';

export async function listarContactosCliente({
	search,
	limit,
	soloDistribuidores = false
}: {
	search?: string;
	limit?: number;
	soloDistribuidores?: boolean;
}) {
	const condiciones: SQL[] = [eq(contactos.activo, true), eq(contactos.es_cliente, true)];
	if (soloDistribuidores) condiciones.push(eq(contactos.es_distribuidor, true));
	if (search?.trim()) {
		const termino = `%${search.trim()}%`;
		condiciones.push(
			or(
				ilike(contactos.razon_social, termino),
				ilike(contactos.nombre, termino),
				ilike(contactos.apellido, termino),
				ilike(contactos.cuit, termino),
				ilike(contactos.email, termino)
			) as SQL
		);
	}
	const where = and(...condiciones);
	const datosQuery = db.select().from(contactos).where(where).orderBy(contactos.razon_social);
	const [datos, [{ total }]] = await Promise.all([
		limit === undefined ? datosQuery : datosQuery.limit(limit),
		db.select({ total: count() }).from(contactos).where(where)
	]);
	return { data: datos, total };
}
