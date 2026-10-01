export const MARGEN_MAX_PORCENTAJE = 99.99;

export function redondearPrecio(valor: number) {
	return Number(valor.toFixed(2));
}

export function calcularPrecioVenta(costo: number, margenPorcentaje: number) {
	if (!Number.isFinite(costo) || costo < 0) throw new Error('El costo debe ser un número positivo');
	if (
		!Number.isFinite(margenPorcentaje) ||
		margenPorcentaje < 0 ||
		margenPorcentaje > MARGEN_MAX_PORCENTAJE
	) {
		throw new Error(`El margen debe estar entre 0 y ${MARGEN_MAX_PORCENTAJE}%`);
	}
	return redondearPrecio(costo / (1 - margenPorcentaje / 100));
}

export function calcularPrecioConDescuento(
	precioLista: number,
	descuentoPorcentaje: number,
	justificacion?: string
) {
	if (!Number.isFinite(precioLista) || precioLista < 0) {
		throw new Error('El precio de lista debe ser un número positivo');
	}
	if (
		!Number.isFinite(descuentoPorcentaje) ||
		descuentoPorcentaje < 0 ||
		descuentoPorcentaje >= 100
	) {
		throw new Error('El descuento debe estar entre 0 y 99.99%');
	}
	if (descuentoPorcentaje > 0 && !justificacion?.trim()) {
		throw new Error('Indicá el motivo del descuento');
	}
	return redondearPrecio(precioLista * (1 - descuentoPorcentaje / 100));
}
