export const TIPOS_ATRIBUTO = ['numero', 'texto'] as const;
export type TipoAtributo = (typeof TIPOS_ATRIBUTO)[number];

export type ValorAtributo = string | number | null;
export type ValoresAtributos = Record<string, ValorAtributo>;

export type DefinicionAtributo = {
	id: number;
	clave: string;
	etiqueta: string;
	grupo: string | null;
	tipo: TipoAtributo;
	unidad: string | null;
	orden: number;
};

export type AtributoConValor = DefinicionAtributo & { valor: ValorAtributo };
export type GrupoAtributos = { nombre: string; atributos: AtributoConValor[] };

const SIN_GRUPO = 'General';

export const tieneValor = (valor: ValorAtributo | undefined) =>
	valor !== null && valor !== undefined && valor !== '';

export function agruparAtributos(
	definiciones: DefinicionAtributo[],
	valores: ValoresAtributos = {}
): GrupoAtributos[] {
	const grupos = new Map<string, GrupoAtributos>();
	for (const definicion of [...definiciones].sort((a, b) => a.orden - b.orden)) {
		const nombre = definicion.grupo || SIN_GRUPO;
		const grupo = grupos.get(nombre) ?? { nombre, atributos: [] };
		grupo.atributos.push({ ...definicion, valor: valores[definicion.clave] ?? null });
		grupos.set(nombre, grupo);
	}
	return [...grupos.values()];
}

export const gruposConValor = (grupos: GrupoAtributos[]) =>
	grupos
		.map((grupo) => ({ ...grupo, atributos: grupo.atributos.filter((a) => tieneValor(a.valor)) }))
		.filter((grupo) => grupo.atributos.length);

export function formatearAtributo({ valor, unidad }: Pick<AtributoConValor, 'valor' | 'unidad'>) {
	if (!tieneValor(valor)) return '-';
	return unidad ? `${valor} ${unidad}` : String(valor);
}

export function limpiarValores(valores: ValoresAtributos, definiciones: DefinicionAtributo[]) {
	const limpios: ValoresAtributos = {};
	for (const { clave, tipo } of definiciones) {
		const valor = valores[clave];
		if (!tieneValor(valor)) continue;
		limpios[clave] = tipo === 'numero' ? Number(valor) : String(valor).trim();
	}
	return limpios;
}
