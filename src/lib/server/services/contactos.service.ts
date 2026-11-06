import { and, count, eq, sql, type SQL } from 'drizzle-orm';
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
		const tokens = search
			.trim()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);
		const textoContacto = sql<string>`translate(lower(concat_ws(' ', coalesce(${contactos.razon_social}, ''), coalesce(${contactos.nombre}, ''), coalesce(${contactos.apellido}, ''), coalesce(${contactos.cuit}, ''), coalesce(${contactos.email}, ''), coalesce(${contactos.telefono}, ''))), 'áéíóúüñ', 'aeiouun')`;
		for (const token of tokens) {
			condiciones.push(sql<boolean>`${textoContacto} LIKE ${`%${token}%`}`);
		}
	}
	const where = and(...condiciones);
	const datosQuery = db.select().from(contactos).where(where).orderBy(contactos.razon_social);
	const [datos, [{ total }]] = await Promise.all([
		limit === undefined ? datosQuery : datosQuery.limit(limit),
		db.select({ total: count() }).from(contactos).where(where)
	]);
	return { data: datos, total };
}
