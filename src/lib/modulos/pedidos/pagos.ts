import { convertirEntreMonedas, type Moneda } from '$lib/utils/moneda';
import { redondearPrecio } from '$lib/utils/precios';

export type PagoEnMoneda = { monto: number; moneda: Moneda; tipo_cambio?: number | null };

export const requiereTipoCambio = (monedaPago: Moneda, monedaPedido: Moneda) =>
	monedaPago !== monedaPedido;

export function montoAplicado(pago: PagoEnMoneda, monedaPedido: Moneda) {
	if (!requiereTipoCambio(pago.moneda, monedaPedido)) return redondearPrecio(pago.monto);
	if (!pago.tipo_cambio || pago.tipo_cambio <= 0) throw new Error('Falta el tipo de cambio');
	return convertirEntreMonedas(pago.monto, pago.moneda, monedaPedido, pago.tipo_cambio);
}

export function ajustarAlSaldo(aplicado: number, saldo: number) {
	return saldo > 0 && Math.abs(aplicado - saldo) <= 0.01 ? redondearPrecio(saldo) : aplicado;
}

export function saldoEnMoneda(
	saldo: number,
	monedaPedido: Moneda,
	monedaPago: Moneda,
	tipoCambio: number | null | undefined
) {
	if (!requiereTipoCambio(monedaPago, monedaPedido)) return redondearPrecio(saldo);
	if (!tipoCambio || tipoCambio <= 0) return null;
	return convertirEntreMonedas(saldo, monedaPedido, monedaPago, tipoCambio);
}
