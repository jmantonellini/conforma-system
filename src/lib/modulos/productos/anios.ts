export function formatearAnios(desde: number | null | undefined, hasta: number | null | undefined) {
	if (desde == null && hasta == null) return '';
	if (desde == null) return `hasta ${hasta}`;
	if (hasta == null) return `${desde} en adelante`;
	if (desde === hasta) return String(desde);
	return `${desde}–${hasta}`;
}

export function anioDeBusqueda(texto: string | undefined) {
	const limpio = texto?.trim() ?? '';
	if (!/^(19|20)\d{2}$/.test(limpio)) return null;
	return Number(limpio);
}
