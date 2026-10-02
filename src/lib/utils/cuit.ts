export function esCuitValido(cuit: string): boolean {
	if (!/^\d{11}$/.test(cuit)) return false;

	const digitos = [...cuit].map(Number);
	const ponderadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
	const suma = ponderadores.reduce((total, ponderador, indice) => {
		return total + digitos[indice] * ponderador;
	}, 0);
	const resto = suma % 11;
	const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

	return digitos[10] === verificador;
}

export function formatearCuit(cuit: string): string {
	const digitos = cuit.replace(/\D/g, '').slice(0, 11);
	if (digitos.length <= 2) return digitos;
	if (digitos.length <= 10) return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
	return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}
