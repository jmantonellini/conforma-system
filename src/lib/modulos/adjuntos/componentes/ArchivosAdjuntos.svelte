<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, Icono, MenuDesplegable, Seccion } from '$lib/ui';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import type { Adjunto, CategoriaAdjunto, TipoEntidadAdjunto } from '$lib/modulos/adjuntos/tipos';
	import { can } from '$lib/utils/permissions';
	import { achicarImagen } from '$lib/utils/imagenes';

	let {
		tipo,
		entidadId,
		adjuntos,
		titulo = 'Archivos adjuntos',
		descripcion,
		categoria = 'general',
		vacio = 'Sin archivos adjuntos.',
		soloLectura = false,
		seccion = true
	}: {
		tipo: TipoEntidadAdjunto;
		entidadId: number;
		adjuntos: Adjunto[];
		titulo?: string;
		descripcion?: string;
		categoria?: CategoriaAdjunto;
		vacio?: string;
		soloLectura?: boolean;
		seccion?: boolean;
	} = $props();

	let subiendo = $state(false);
	let progreso = $state('');
	let arrastrando = $state(false);
	let ampliada = $state<Adjunto | null>(null);

	const SOLO_IMAGENES = 'image/jpeg,image/png,image/webp';
	const TIPOS_ARCHIVO = `${SOLO_IMAGENES},audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,video/quicktime,application/pdf`;
	const MODULOS = {
		cotizacion: 'cotizaciones',
		pedido: 'pedidos',
		producto: 'productos',
		fabricacion: 'fabricacion'
	} as const;
	const ACEPTA_FOTOS = 'image/*,video/mp4,video/quicktime';
	const esFotos = $derived(categoria === 'recepcion' || categoria === 'despacho');
	const puedeSubir = $derived(
		!soloLectura &&
			(can(page.data.user, page.data.permisos, MODULOS[tipo], 'edit') ||
				(tipo === 'cotizacion' &&
					can(page.data.user, page.data.permisos, 'cotizaciones', 'create')))
	);

	const url = (id: number) => resolve(`/adjuntos/${id}`);
	const esImagen = (adjunto: Adjunto) => adjunto.mime_type?.startsWith('image/') ?? false;

	async function subirUno(archivo: File) {
		const cuerpo = new FormData();
		cuerpo.set('tipo', tipo);
		cuerpo.set('entidad_id', String(entidadId));
		cuerpo.set('accion', tipo === 'producto' ? 'edit' : 'create');
		cuerpo.set('categoria', categoria);
		cuerpo.append('archivos', await achicarImagen(archivo));
		const respuesta = await fetch(resolve('/adjuntos'), { method: 'POST', body: cuerpo });
		const resultado = (await respuesta.json().catch(() => null)) as {
			error?: string;
			resultados?: { error?: string }[];
		} | null;
		if (respuesta.status === 413) return 'es demasiado grande (máx. 25 MB)';
		if (!respuesta.ok) return resultado?.error || 'no se pudo subir';
		return resultado?.resultados?.find((r) => r.error)?.error ?? null;
	}

	async function subir(lista: FileList | null | undefined) {
		const archivos = [...(lista ?? [])];
		if (!archivos.length || subiendo) return;
		subiendo = true;
		const fallidos: string[] = [];
		try {
			for (const [indice, archivo] of archivos.entries()) {
				progreso = archivos.length > 1 ? `${indice + 1} de ${archivos.length}` : '';
				try {
					const fallo = await subirUno(archivo);
					if (fallo) fallidos.push(`${archivo.name}: ${fallo}`);
				} catch {
					fallidos.push(`${archivo.name}: sin conexión`);
				}
			}
			if (fallidos.length) toast.error(fallidos.join(' · '));
			if (fallidos.length < archivos.length) {
				const subidos = archivos.length - fallidos.length;
				toast.success(subidos === 1 ? 'Archivo subido' : `${subidos} archivos subidos`);
				await invalidateAll();
			}
		} finally {
			subiendo = false;
			progreso = '';
		}
	}

	async function recategorizar(adjunto: Adjunto, nueva: CategoriaAdjunto, exito: string) {
		try {
			const respuesta = await fetch(url(adjunto.id), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ categoria: nueva })
			});
			if (!respuesta.ok) throw new Error((await respuesta.json().catch(() => null))?.message);
			await invalidateAll();
			toast.success(exito);
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo actualizar el archivo'));
		}
	}

	const eliminar = (adjunto: Adjunto) =>
		confirmarYEjecutar({
			mensaje: `¿Eliminar ${adjunto.nombre_original}?`,
			ejecutar: async () => {
				const respuesta = await fetch(url(adjunto.id), { method: 'DELETE' });
				if (!respuesta.ok) throw new Error('No se pudo eliminar el archivo');
				await invalidateAll();
			},
			exito: 'Archivo eliminado'
		});
</script>

{#snippet contenido()}
	{#if puedeSubir}
		<label
			class={[
				'relative flex cursor-pointer flex-col items-center gap-1 rounded-box border border-dashed border-base-300 px-4 py-5 text-center text-sm transition-colors hover:border-primary hover:bg-base-200/50',
				arrastrando && 'border-primary bg-primary/5'
			]}
			ondragenter={() => (arrastrando = true)}
			ondragleave={() => (arrastrando = false)}
			ondrop={() => (arrastrando = false)}
		>
			<Icono nombre="clip" class="size-5 text-base-content/50" />
			<span>
				{#if subiendo}
					Subiendo{progreso ? ` ${progreso}` : ''}...
				{:else}
					<span class="font-medium text-primary">Elegí archivos</span> o arrastralos acá
				{/if}
			</span>
			<span class="secundario">
				{categoria === 'general'
					? 'Imágenes, audio, video o PDF'
					: esFotos
						? 'Fotos o videos. Desde el celular podés sacarlas en el momento.'
						: 'Imágenes JPEG, PNG o WebP'}
			</span>
			<input
				type="file"
				multiple
				accept={categoria === 'general' ? TIPOS_ARCHIVO : esFotos ? ACEPTA_FOTOS : SOLO_IMAGENES}
				class="absolute inset-0 cursor-pointer opacity-0"
				disabled={subiendo}
				onchange={(e) => {
					const entrada = e.currentTarget;
					void subir(entrada.files).then(() => (entrada.value = ''));
				}}
			/>
		</label>
		{#if categoria !== 'portada'}
			<label
				class={[
					'btn hidden w-full btn-outline btn-primary pointer-coarse:inline-flex',
					subiendo && 'btn-disabled'
				]}
			>
				<Icono nombre="camara" class="size-5" />
				Sacar foto
				<input
					type="file"
					accept="image/*"
					capture="environment"
					class="hidden"
					disabled={subiendo}
					onchange={(e) => {
						const entrada = e.currentTarget;
						void subir(entrada.files).then(() => (entrada.value = ''));
					}}
				/>
			</label>
		{/if}
	{/if}

	{#if adjuntos.length}
		<ul class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
			{#each adjuntos as adjunto (adjunto.id)}
				{@const propio = !(tipo === 'fabricacion' && adjunto.propietario.tipo === 'producto')}
				<li class="group overflow-hidden rounded-box border border-base-300 bg-base-100">
					{#if esImagen(adjunto)}
						<button
							type="button"
							class="block aspect-4/3 w-full cursor-zoom-in bg-base-200"
							aria-label="Ampliar {adjunto.nombre_original}"
							onclick={() => (ampliada = adjunto)}
						>
							<img src={url(adjunto.id)} alt="" class="size-full object-cover" loading="lazy" />
						</button>
					{:else if adjunto.mime_type?.startsWith('audio/')}
						<div class="grid aspect-4/3 place-items-center bg-base-200 p-2">
							<audio controls src={url(adjunto.id)} class="w-full"></audio>
						</div>
					{:else if adjunto.mime_type?.startsWith('video/')}
						<video controls preload="none" class="aspect-4/3 w-full bg-neutral object-contain">
							<source src={url(adjunto.id)} type={adjunto.mime_type} />
						</video>
					{:else}
						<a
							href={resolve(`/adjuntos/${adjunto.id}`)}
							target="_blank"
							rel="noreferrer"
							class="grid aspect-4/3 place-items-center bg-base-200 text-xs font-semibold text-base-content/60 uppercase hover:text-primary"
						>
							{adjunto.nombre_original.split('.').pop()}
						</a>
					{/if}
					<div class="flex items-center gap-1 py-1 pr-1 pl-2.5">
						<a
							class="min-w-0 flex-1 truncate text-xs hover:text-primary"
							href={resolve(`/adjuntos/${adjunto.id}`)}
							target="_blank"
							rel="noreferrer"
							title={adjunto.nombre_original}>{adjunto.nombre_original}</a
						>
						{#if adjunto.categoria === 'plano' && categoria !== 'plano'}
							<span class="badge badge-soft badge-xs badge-info">Plano</span>
						{/if}
						{#if propio && !soloLectura}
							<Can modulo={MODULOS[adjunto.propietario.tipo]} accion="edit">
								<MenuDesplegable
									alFinal
									class="btn btn-square btn-ghost btn-xs"
									titulo="Acciones del archivo"
								>
									{#snippet etiqueta()}<Icono nombre="mas" />{/snippet}
									{#if tipo === 'producto' && esImagen(adjunto)}
										{#if adjunto.categoria !== 'portada'}
											<li>
												<button
													onclick={() => recategorizar(adjunto, 'portada', 'Portada actualizada')}
													>Usar como portada</button
												>
											</li>
										{/if}
										{#if adjunto.categoria !== 'plano'}
											<li>
												<button onclick={() => recategorizar(adjunto, 'plano', 'Movido a planos')}
													>Mover a planos</button
												>
											</li>
										{/if}
										{#if adjunto.categoria !== 'general'}
											<li>
												<button
													onclick={() => recategorizar(adjunto, 'general', 'Movido a archivos')}
													>Mover a archivos</button
												>
											</li>
										{/if}
									{/if}
									<li>
										<button class="text-error" onclick={() => eliminar(adjunto)}>Eliminar</button>
									</li>
								</MenuDesplegable>
							</Can>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-base-content/60">{vacio}</p>
	{/if}
{/snippet}

{#if seccion}
	<Seccion {titulo} {descripcion}>{@render contenido()}</Seccion>
{:else}
	<div class="flex flex-col gap-3">{@render contenido()}</div>
{/if}

{#if ampliada}
	<dialog
		class="modal"
		{@attach (d) => d.showModal()}
		onclose={() => (ampliada = null)}
		aria-label={ampliada.nombre_original}
	>
		<div class="modal-box w-[min(96vw,80rem)] max-w-none p-2">
			<img
				src={url(ampliada.id)}
				alt={ampliada.nombre_original}
				class="mx-auto max-h-[85vh] max-w-full object-contain"
			/>
		</div>
		<form method="dialog" class="modal-backdrop bg-base-content/60"><button>Cerrar</button></form>
	</dialog>
{/if}
