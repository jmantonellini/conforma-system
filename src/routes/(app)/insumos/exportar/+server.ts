import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requirePermission } from '$lib/server/auth/permissions';
import { db } from '$lib/server/db';
import { categorias_insumos, contactos, insumos, proveedores } from '$lib/server/db/schema';

export async function GET() {
	try {
		await requirePermission('insumos', 'view');
	} catch (cause) {
		if (
			cause instanceof Error &&
			['No autorizado', 'No tenés permiso para realizar esta acción'].includes(cause.message)
		) {
			throw error(403, 'No tenés permiso para exportar insumos');
		}
		throw cause;
	}

	const filas = await db
		.select({
			codigo: insumos.codigo,
			nombre: insumos.nombre,
			tipo: insumos.tipo,
			tipo_id: insumos.tipo_id,
			unidad: insumos.unidad,
			unidad_id: insumos.unidad_id,
			costo_unitario: insumos.costo_unitario,
			flete_porcentaje: insumos.flete_porcentaje,
			categoria: categorias_insumos.nombre,
			categoria_id: insumos.categoria_id,
			proveedor: proveedores.codigo,
			proveedor_nombre: contactos.razon_social,
			activo: insumos.activo,
			observaciones: insumos.observaciones,
			created_at: insumos.created_at,
			updated_at: insumos.updated_at
		})
		.from(insumos)
		.leftJoin(categorias_insumos, eq(insumos.categoria_id, categorias_insumos.id))
		.leftJoin(proveedores, eq(insumos.proveedor_id, proveedores.id))
		.leftJoin(contactos, eq(proveedores.contacto_id, contactos.id))
		.orderBy(asc(insumos.codigo));

	const hoja = XLSX.utils.json_to_sheet(filas);
	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, 'Insumos');
	const archivo = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

	return new Response(archivo, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="insumos.xlsx"',
			'Cache-Control': 'no-store'
		}
	});
}
