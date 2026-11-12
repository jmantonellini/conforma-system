/**
 * Alertas de errores de producción como issues de GitHub.
 *
 * - Cada error se identifica por una huella (mensaje + primera línea propia del stack):
 *   el mismo error no abre issues duplicados, se comenta en el issue abierto.
 * - Se limita a un aviso por huella cada `ESPERA_MS` para no inundar el repo ante una cascada.
 * - Solo actúa si están `GITHUB_ISSUES_TOKEN` y `GITHUB_ISSUES_REPO` (en dev no hace nada).
 *
 * GitHub notifica por email/app móvil a quien vigila el repo: alcanza para un equipo chico.
 */
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';

const ESPERA_MS = 60 * 60 * 1000;
const ETIQUETAS = ['bug', 'produccion'];
const ultimoAviso = new Map<string, number>();

export type ContextoError = {
	ruta?: string;
	metodo?: string;
	estado?: number;
	usuario?: string | null;
};

const configurado = () => Boolean(env.GITHUB_ISSUES_TOKEN && env.GITHUB_ISSUES_REPO);

function huella(error: unknown) {
	const mensaje = error instanceof Error ? error.message : String(error);
	const marco =
		(error instanceof Error ? error.stack : '')
			?.split('\n')
			.find((linea) => linea.includes('/src/') || linea.includes('/build/')) ?? '';
	// Quitar números de línea/columna variables entre builds y valores dinámicos del mensaje.
	const normalizado = `${mensaje.replace(/\d+/g, '#')}|${marco.replace(/:\d+:\d+/g, '')}`;
	return createHash('sha1').update(normalizado).digest('hex').slice(0, 12);
}

async function github(ruta: string, init?: RequestInit) {
	const respuesta = await fetch(`https://api.github.com${ruta}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${env.GITHUB_ISSUES_TOKEN}`,
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'erp-monitoreo',
			...init?.headers
		}
	});
	if (!respuesta.ok) throw new Error(`GitHub ${respuesta.status}: ${await respuesta.text()}`);
	return respuesta.json();
}

function cuerpo(error: unknown, contexto: ContextoError, id: string) {
	const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
	return [
		`**${contexto.metodo ?? ''} ${contexto.ruta ?? '(fuera de una request)'}** → ${contexto.estado ?? 500}`,
		`Usuario: ${contexto.usuario ?? 'anónimo'} · ${new Date().toISOString()}`,
		'',
		'```',
		stack.slice(0, 6000),
		'```',
		'',
		`<!-- huella:${id} -->`
	].join('\n');
}

/** Reporta el error sin bloquear ni romper la respuesta (fire-and-forget). */
export function reportarError(error: unknown, contexto: ContextoError = {}) {
	if (!configurado()) return;
	const id = huella(error);
	const ahora = Date.now();
	if (ahora - (ultimoAviso.get(id) ?? 0) < ESPERA_MS) return;
	ultimoAviso.set(id, ahora);

	void (async () => {
		const repo = env.GITHUB_ISSUES_REPO;
		const busqueda = await github(
			`/search/issues?q=${encodeURIComponent(`repo:${repo} is:issue is:open in:body huella:${id}`)}`
		);
		const existente = busqueda.items?.[0];
		if (existente) {
			await github(`/repos/${repo}/issues/${existente.number}/comments`, {
				method: 'POST',
				body: JSON.stringify({ body: `Se repitió.\n\n${cuerpo(error, contexto, id)}` })
			});
			return;
		}
		const mensaje = error instanceof Error ? error.message : String(error);
		await github(`/repos/${repo}/issues`, {
			method: 'POST',
			body: JSON.stringify({
				title: `[prod] ${mensaje.slice(0, 120)}`,
				body: cuerpo(error, contexto, id),
				labels: ETIQUETAS
			})
		});
	})().catch((fallo) => console.error('[monitoreo] No se pudo reportar el error:', fallo));
}
