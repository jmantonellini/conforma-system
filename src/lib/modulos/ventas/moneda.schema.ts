import * as v from 'valibot';
import { MONEDAS } from '$lib/utils/moneda';

export const CambioMonedaSchema = v.object({
	id: v.pipe(v.number(), v.integer(), v.minValue(1)),
	moneda: v.picklist(MONEDAS),
	modo: v.picklist(['convertir', 'corregir']),
	tipo_cambio: v.pipe(v.number(), v.minValue(0.0001, 'Ingresá un tipo de cambio válido'))
});
