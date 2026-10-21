export const MARGEN_MAX_PORCENTAJE = 99.99;

export function redondearPrecio(valor: number) {
	return Number(valor.toFixed(2));
}

export function parsearNumeroDecimal(valor: string): number | null {
	const texto = valor.trim();
	if (!texto) return null;

	const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
	const numero = Number(normalizado);
	return Number.isFinite(numero) ? numero : null;
}

const formatoDosDecimales = new Intl.NumberFormat('es-AR', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

export function formatearDosDecimales(valor: number | null | undefined) {
	return formatoDosDecimales.format(Number(valor ?? 0));
}

export function calcularIva21(base: number) {
	return redondearPrecio(base * 0.21);
}

export function calcularCostoComposicion(
	materiales: readonly { cantidad: number; costo_unitario?: number | null }[]
) {
	return redondearPrecio(
		materiales.reduce(
			(total, material) => total + material.cantidad * (material.costo_unitario ?? 0),
			0
		)
	);
}

export function ajustarPrecioPorCambioDeCosto(
	precioUnitario: number,
	costoAnterior: number,
	costoNuevo: number
) {
	return redondearPrecio(Math.max(precioUnitario + costoNuevo - costoAnterior, 0));
}

export function precioNetoCubreCosto(precioNeto: number, costoMateriales: number) {
	return redondearPrecio(precioNeto) >= redondearPrecio(costoMateriales);
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
