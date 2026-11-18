import * as v from 'valibot';
import { MENSAJE_TIPO_CAMBIO, MONEDAS, TIPO_CAMBIO_MINIMO } from '$lib/utils/moneda';

export const CambioMonedaSchema = v.object({
	id: v.pipe(v.number(), v.integer(), v.minValue(1)),
	moneda: v.picklist(MONEDAS),
	modo: v.picklist(['convertir', 'corregir']),
	tipo_cambio: v.pipe(v.number(), v.minValue(TIPO_CAMBIO_MINIMO, MENSAJE_TIPO_CAMBIO))
});
