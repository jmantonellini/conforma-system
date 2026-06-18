/**
 * Configura las cabeceras para una respuesta cacheadle por el navegador.
 * @param seconds Número de segundos que la respuesta debe ser considerada fresca.
 */
export function withCache(seconds: number): ResponseInit {
	return {
		headers: {
			// `max-age` es la directiva principal para la caché del navegador.
			// Le decimos: "no preguntes si los datos son nuevos por X segundos" [citation:9].
			'Cache-Control': `max-age=${seconds}`
			// También se puede añadir 'stale-while-revalidate' para una estrategia más avanzada,
			// que devuelve datos antiguos mientras se actualizan en segundo plano.
			// 'Cache-Control': `max-age=${seconds}, stale-while-revalidate=${seconds * 2}`
		}
	};
}
