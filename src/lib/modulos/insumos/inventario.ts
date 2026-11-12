const TOLERANCIA_STOCK = 1e-9;

export function hayStockSuficiente(disponible: number, solicitado: number) {
	return disponible + TOLERANCIA_STOCK >= solicitado;
}
