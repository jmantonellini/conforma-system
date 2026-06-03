import type { PageServerLoad, Actions } from './$types';
import { getProductos, createProducto, deleteProducto } from '$lib/server/services/productos';
import { fail } from '@sveltejs/kit';
import { updateProducto } from '$lib/server/services/productos';

export const load: PageServerLoad = async ({ locals, url }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoria = url.searchParams.get('categoria') || undefined;
	const page = parseInt(url.searchParams.get('page') || '1');

	const { data, categorias, total, totalPages } = await getProductos(
		locals.db,
		search,
		categoria ? parseInt(categoria) : undefined,
		page
	);

	return {
		productos: data,
		categorias,
		total,
		totalPages,
		currentPage: page,
		search,
		categoriaActual: categoria
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();

		const productoData = {
			codigo: formData.get('codigo') as string,
			nombre: formData.get('nombre') as string,
			categoria_id: formData.get('categoria_id')
				? parseInt(formData.get('categoria_id') as string)
				: undefined,
			medidas_primario_diametro: formData.get('medidas_primario_diametro')
				? parseInt(formData.get('medidas_primario_diametro') as string)
				: undefined,
			medidas_primario_largo: formData.get('medidas_primario_largo')
				? parseInt(formData.get('medidas_primario_largo') as string)
				: undefined,
			medidas_secundario_diametro: formData.get('medidas_secundario_diametro')
				? parseInt(formData.get('medidas_secundario_diametro') as string)
				: undefined,
			medidas_secundario_largo: formData.get('medidas_secundario_largo')
				? parseInt(formData.get('medidas_secundario_largo') as string)
				: undefined,
			trombon_diametro_inicial: formData.get('trombon_diametro_inicial')
				? parseInt(formData.get('trombon_diametro_inicial') as string)
				: undefined,
			trombon_largo: formData.get('trombon_largo')
				? parseInt(formData.get('trombon_largo') as string)
				: undefined,
			trombon_observaciones: (formData.get('trombon_observaciones') as string) || undefined,
			precio_base: formData.get('precio_base')
				? parseFloat(formData.get('precio_base') as string)
				: undefined,
			es_personalizable: formData.get('es_personalizable') === 'on'
		};

		if (!productoData.codigo || !productoData.nombre) {
			return fail(400, { error: 'Código y nombre son requeridos' });
		}

		await createProducto(locals.db, productoData);
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);

		const productoData = {
			codigo: formData.get('codigo') as string,
			nombre: formData.get('nombre') as string,
			categoria_id: formData.get('categoria_id')
				? parseInt(formData.get('categoria_id') as string)
				: undefined,
			medidas_primario_diametro: formData.get('medidas_primario_diametro')
				? parseInt(formData.get('medidas_primario_diametro') as string)
				: undefined,
			medidas_primario_largo: formData.get('medidas_primario_largo')
				? parseInt(formData.get('medidas_primario_largo') as string)
				: undefined,
			medidas_secundario_diametro: formData.get('medidas_secundario_diametro')
				? parseInt(formData.get('medidas_secundario_diametro') as string)
				: undefined,
			medidas_secundario_largo: formData.get('medidas_secundario_largo')
				? parseInt(formData.get('medidas_secundario_largo') as string)
				: undefined,
			trombon_diametro_inicial: formData.get('trombon_diametro_inicial')
				? parseInt(formData.get('trombon_diametro_inicial') as string)
				: undefined,
			trombon_largo: formData.get('trombon_largo')
				? parseInt(formData.get('trombon_largo') as string)
				: undefined,
			trombon_observaciones: (formData.get('trombon_observaciones') as string) || undefined,
			precio_base: formData.get('precio_base')
				? parseFloat(formData.get('precio_base') as string)
				: undefined,
			es_personalizable: formData.get('es_personalizable') === 'on'
		};

		await updateProducto(locals.db, id, productoData);
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		await deleteProducto(locals.db, id);
		return { success: true };
	}
};
