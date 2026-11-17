export function refrescarCada(refrescar: () => Promise<unknown>, ms: number) {
	const ejecutar = () => {
		if (document.hidden || !navigator.onLine) return;
		refrescar().catch(() => {});
	};
	const alVolver = () => {
		if (!document.hidden) ejecutar();
	};
	const intervalo = setInterval(ejecutar, ms);
	document.addEventListener('visibilitychange', alVolver);
	return () => {
		clearInterval(intervalo);
		document.removeEventListener('visibilitychange', alVolver);
	};
}
