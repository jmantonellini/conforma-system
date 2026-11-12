import type { MaterialSnapshot } from '$lib/modulos/cotizaciones/tipos';

export function esMaterialSubproducto(material: MaterialSnapshot) {
	return Boolean(material.producto_id);
}

export function describeMaterialReceta(material: MaterialSnapshot) {
	if (esMaterialSubproducto(material)) {
		return `${material.cantidad} x · ${material.nombre}`;
	}

	const unidad = material.unidad ? ` ${material.unidad}` : '';
	return `${material.cantidad}${unidad} · ${material.nombre}`;
}
