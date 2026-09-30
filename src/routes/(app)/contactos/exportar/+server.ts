import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requirePermission } from '$lib/server/auth/permissions';
import { db } from '$lib/server/db';
import { contactos, proveedores } from '$lib/server/db/schema';

export async function GET() {
	try {
		await requirePermission('contactos', 'view');
	} catch (cause) {
		if (
			cause instanceof Error &&
			['No autorizado', 'No tenés permiso para realizar esta acción'].includes(cause.message)
		) {
			throw error(403, 'No tenés permiso para exportar contactos');
		}
		throw cause;
	}

	const resultados = await db
		.select({ contacto: contactos, proveedor: proveedores })
		.from(contactos)
		.leftJoin(proveedores, eq(proveedores.contacto_id, contactos.id))
		.orderBy(asc(contactos.razon_social));

	const filas = resultados.map(({ contacto, proveedor }) => {
		const esProveedor = Boolean(proveedor);
		const esCliente = Boolean(contacto.es_cliente || contacto.es_distribuidor);
		return {
			id: contacto.id,
			razon_social: contacto.razon_social,
			nombre: contacto.nombre,
			apellido: contacto.apellido,
			cuit: contacto.cuit,
			email: contacto.email,
			telefono: contacto.telefono,
			pais: contacto.pais,
			provincia: contacto.provincia,
			ciudad: contacto.ciudad,
			codigo_postal: contacto.codigo_postal,
			calle: contacto.calle,
			numero: contacto.numero,
			piso: contacto.piso,
			departamento: contacto.departamento,
			rol:
				esCliente && esProveedor
					? 'ambos'
					: esCliente
						? 'cliente'
						: esProveedor
							? 'proveedor'
							: 'ninguno',
			es_distribuidor: contacto.es_distribuidor,
			porcentaje_compensacion: contacto.porcentaje_compensacion,
			saldo_disponible: contacto.saldo_disponible,
			codigo_proveedor: proveedor?.codigo,
			contacto_proveedor: proveedor?.contacto_nombre,
			contacto_email_proveedor: proveedor?.contacto_email,
			contacto_telefono_proveedor: proveedor?.contacto_telefono,
			condiciones_pago: proveedor?.condiciones_pago,
			proveedor_activo: proveedor?.activo,
			activo: contacto.activo,
			created_at: contacto.created_at,
			updated_at: contacto.updated_at
		};
	});

	const hoja = XLSX.utils.json_to_sheet(filas);
	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, 'Contactos');
	const archivo = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

	return new Response(archivo, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="contactos.xlsx"',
			'Cache-Control': 'no-store'
		}
	});
}
