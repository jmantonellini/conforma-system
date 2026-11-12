import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { empresaActual, empresas } from '$lib/server/db/schema';

type DatosEmpresa = Partial<Omit<typeof empresas.$inferInsert, 'id' | 'created_at'>>;

export async function obtenerEmpresa() {
	const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaActual));
	return empresa;
}

export async function actualizarEmpresa(datos: DatosEmpresa) {
	const [empresa] = await db
		.update(empresas)
		.set({ ...datos, updated_at: new Date() })
		.where(eq(empresas.id, empresaActual))
		.returning();
	return empresa;
}
