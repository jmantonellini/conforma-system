const LADO_MAXIMO = 2400;
const CALIDAD = 0.85;
const LIVIANA = 1.5 * 1024 * 1024;
const FORMATOS_DIRECTOS = ['image/jpeg', 'image/png', 'image/webp'];

const escalaPara = (ancho: number, alto: number) =>
	Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));

export async function achicarImagen(archivo: File): Promise<File> {
	if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif') return archivo;
	let imagen: ImageBitmap;
	try {
		imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
	} catch {
		return archivo;
	}
	try {
		const escala = escalaPara(imagen.width, imagen.height);
		if (escala === 1 && archivo.size <= LIVIANA && FORMATOS_DIRECTOS.includes(archivo.type))
			return archivo;
		const lienzo = document.createElement('canvas');
		lienzo.width = Math.round(imagen.width * escala);
		lienzo.height = Math.round(imagen.height * escala);
		lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
		const blob = await new Promise<Blob | null>((listo) =>
			lienzo.toBlob(listo, 'image/jpeg', CALIDAD)
		);
		if (!blob) return archivo;
		const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';
		return new File([blob], nombre, { type: 'image/jpeg', lastModified: archivo.lastModified });
	} finally {
		imagen.close();
	}
}
