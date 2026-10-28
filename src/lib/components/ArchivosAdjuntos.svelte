<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Adjunto, TipoEntidadAdjunto } from '$lib/types/adjuntos';
	import { can } from '$lib/utils/permissions';

	let {
		tipo,
		entidadId,
		adjuntos
	}: {
		tipo: TipoEntidadAdjunto;
		entidadId: number;
		adjuntos: Adjunto[];
	} = $props();
	let subiendo = $state(false);
	let marcarComoPlano = $state(false);
	let arrastrandoArchivos = $state(false);
	let imagenSeleccionada = $state<{ src: string; nombre: string } | null>(null);
	let dialogImagen: HTMLDialogElement | undefined;

	const TIPOS_ARCHIVO =
		'image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf';
	const permisoModulo = (tipoAdjunto: TipoEntidadAdjunto) =>
		tipoAdjunto === 'cotizacion'
			? 'cotizaciones'
			: tipoAdjunto === 'pedido'
				? 'pedidos'
				: tipoAdjunto === 'producto'
					? 'productos'
					: 'taller';
	const puedeSubir = $derived(
		can(page.data.user, page.data.permisos, permisoModulo(tipo), 'edit') ||
			(tipo === 'cotizacion' && can(page.data.user, page.data.permisos, 'cotizaciones', 'create'))
	);

	async function subirArchivos(files: FileList | null, input?: HTMLInputElement) {
		if (!files?.length || subiendo) return;

		subiendo = true;
		const formData = new FormData();
		formData.set('tipo', tipo);
		formData.set('entidad_id', String(entidadId));
		formData.set('accion', tipo === 'producto' ? 'edit' : 'create');
		formData.set('es_plano', String(tipo === 'producto' && marcarComoPlano));
		for (const archivo of Array.from(files)) formData.append('archivos', archivo);

		try {
			const response = await fetch(resolve('/adjuntos'), { method: 'POST', body: formData });
			const resultado = (await response.json().catch(() => null)) as {
				error?: string;
				resultados?: { nombre: string; error?: string }[];
			} | null;
			if (!response.ok) {
				toast.error(resultado?.error || 'No se pudieron subir los archivos');
				return;
			}

			const fallidos = (resultado?.resultados ?? []).filter((archivo) => archivo.error);
			if (fallidos.length) {
				toast.error(fallidos.map((archivo) => `${archivo.nombre}: ${archivo.error}`).join(' · '));
			} else {
				toast.success('Archivos adjuntados');
				if (tipo === 'producto') marcarComoPlano = false;
			}
			await invalidateAll();
		} catch {
			toast.error('No se pudo conectar para subir los archivos');
		} finally {
			if (input) input.value = '';
			subiendo = false;
		}
	}

	function seleccionarArchivos(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void subirArchivos(input.files, input);
	}

	function manejarDragSobre(event: DragEvent) {
		event.preventDefault();
		if (!subiendo) arrastrandoArchivos = true;
	}

	function manejarSalidaDrag(event: DragEvent) {
		const siguiente = event.relatedTarget;
		if (
			siguiente instanceof Node &&
			event.currentTarget instanceof Node &&
			event.currentTarget.contains(siguiente)
		) {
			return;
		}
		arrastrandoArchivos = false;
	}

	function soltarArchivos(event: DragEvent) {
		event.preventDefault();
		arrastrandoArchivos = false;
		void subirArchivos(event.dataTransfer?.files ?? null);
	}

	function esImagen(mimeType: string | null) {
		return mimeType?.startsWith('image/') ?? false;
	}

	function esAudio(mimeType: string | null) {
		return mimeType?.startsWith('audio/') ?? false;
	}

	function esVideo(mimeType: string | null) {
		return mimeType?.startsWith('video/') ?? false;
	}

	function urlAdjunto(id: number) {
		return resolve(`/adjuntos/${id}`);
	}

	function ampliarImagen(adjunto: Adjunto) {
		imagenSeleccionada = { src: urlAdjunto(adjunto.id), nombre: adjunto.nombre_original };
		dialogImagen?.showModal();
	}

	function registrarDialogImagen(element: HTMLDialogElement) {
		dialogImagen = element;
		return () => (dialogImagen = undefined);
	}

	async function borrarAdjunto(id: number) {
		try {
			const response = await fetch(urlAdjunto(id), { method: 'DELETE' });
			if (!response.ok) throw new Error('No se pudo eliminar el archivo');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el archivo');
		}
	}
</script>

<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
	<legend class="fieldset-legend">Archivos adjuntos</legend>
	{#if puedeSubir}
		<div
			class={[
				'mt-3 rounded-box border border-dashed border-base-300 p-4 transition-colors',
				arrastrandoArchivos && 'border-primary bg-primary/5'
			]}
			role="region"
			aria-label="Zona para adjuntar archivos"
			ondragenter={manejarDragSobre}
			ondragover={manejarDragSobre}
			ondragleave={manejarSalidaDrag}
			ondrop={soltarArchivos}
		>
			<p class="mb-3 text-sm text-base-content/70">
				{arrastrandoArchivos
					? 'Soltá para adjuntar los archivos'
					: 'Arrastrá archivos aquí o seleccioná desde tu dispositivo'}
			</p>
			<input
				type="file"
				multiple
				accept={tipo === 'producto' && marcarComoPlano
					? 'image/jpeg,image/png,image/webp'
					: TIPOS_ARCHIVO}
				class="file-input w-full max-w-md"
				disabled={subiendo}
				onchange={seleccionarArchivos}
			/>
			{#if tipo === 'producto'}
				<label class="label mt-2 w-fit cursor-pointer gap-3">
					<input type="checkbox" class="toggle toggle-sm" bind:checked={marcarComoPlano} />
					<span>Subir como plano de fabricación</span>
				</label>
			{/if}
		</div>
	{/if}
	{#if subiendo}
		<p class="mt-2 text-sm text-base-content/60">Subiendo archivos...</p>
	{/if}
	<div class="flex flex-wrap gap-3">
		{#each adjuntos as adjunto (adjunto.id)}
			<div class="card w-64 max-w-full bg-base-100">
				{#if esImagen(adjunto.mime_type)}
					<button
						type="button"
						class="block w-full cursor-zoom-in"
						aria-label={`Ampliar imagen: ${adjunto.nombre_original}`}
						onclick={() => ampliarImagen(adjunto)}
					>
						<img
							src={urlAdjunto(adjunto.id)}
							alt={adjunto.nombre_original}
							class="h-40 w-full rounded-t-box object-cover"
						/>
					</button>
				{:else if esAudio(adjunto.mime_type)}
					<div class="p-3">
						<audio controls src={urlAdjunto(adjunto.id)} class="w-full"></audio>
					</div>
				{:else if esVideo(adjunto.mime_type)}
					<video
						controls
						preload="none"
						class="h-40 w-full bg-neutral object-contain"
						aria-label={adjunto.nombre_original}
					>
						<source src={urlAdjunto(adjunto.id)} type={adjunto.mime_type ?? 'video/mp4'} />
					</video>
				{:else}
					<a
						href={urlAdjunto(adjunto.id)}
						target="_blank"
						rel="noreferrer"
						class="flex h-40 items-center justify-center bg-base-200 p-3 text-center text-sm"
					>
						{adjunto.nombre_original}
					</a>
				{/if}
				<div class="flex items-center justify-between p-2 text-xs">
					<span class="truncate underline" title={adjunto.nombre_original}>
						{adjunto.nombre_original}
					</span>
					{#if adjunto.es_plano}
						<span class="badge badge-sm badge-info">Plano</span>
					{/if}
					{#if !(tipo === 'fabricacion' && adjunto.propietario.tipo === 'producto')}
						<Can modulo={permisoModulo(adjunto.propietario.tipo)} accion="edit">
							<button
								type="button"
								class="btn btn-ghost text-error btn-xs"
								aria-label={`Eliminar adjunto: ${adjunto.nombre_original}`}
								onclick={() => borrarAdjunto(adjunto.id)}
							>
								✕
							</button>
						</Can>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-base-content/50">Sin archivos adjuntos.</p>
		{/each}
	</div>
</fieldset>

<dialog class="modal" {@attach registrarDialogImagen} aria-labelledby="imagen-ampliada-titulo">
	<div class="modal-box w-[min(96vw,80rem)] max-w-none p-3">
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 id="imagen-ampliada-titulo" class="truncate font-semibold">
				{imagenSeleccionada?.nombre}
			</h2>
			<form method="dialog">
				<button class="btn btn-ghost btn-sm" aria-label="Cerrar imagen ampliada">Cerrar</button>
			</form>
		</div>
		{#if imagenSeleccionada}
			<img
				src={imagenSeleccionada.src}
				alt={imagenSeleccionada.nombre}
				class="mx-auto max-h-[80vh] max-w-full object-contain"
			/>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button>Cerrar</button></form>
</dialog>
