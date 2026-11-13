<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Can,
		EncabezadoDetalle,
		FormActions,
		FormErrors,
		FormFieldWrapper,
		PageLayout,
		Seccion
	} from '$lib/ui';
	import {
		actualizarInsumo,
		eliminarInsumo,
		getCategoriasInsumo,
		obtenerProveedores,
		getTiposInsumo,
		getUnidadesInsumo
	} from '$lib/modulos/insumos/insumos.remote';
	import { toast } from '$lib/ui/toast.svelte';
	import { ETIQUETAS_MOVIMIENTO_INSUMO } from '$lib/modulos/insumos/tipos';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const insumo = $derived(data.insumo);
	const form = actualizarInsumo;
	const urlImagen = $derived(resolve(`/insumos/${insumo.id}/imagen`));
	let subiendo = $state(false);

	const cantidad = (valor: number) =>
		new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(valor);

	const costoBase = $derived(Number(form.fields.costo_unitario.value()) || 0);
	const flete = $derived(Number(form.fields.flete_porcentaje.value()) || 0);
	const costoFinal = $derived(costoBase * (1 + flete / 100));

	async function imagen(metodo: 'POST' | 'DELETE', archivo?: File) {
		subiendo = true;
		try {
			const cuerpo = new FormData();
			if (archivo) cuerpo.set('imagen', archivo);
			const respuesta = await fetch(urlImagen, {
				method: metodo,
				body: archivo ? cuerpo : undefined
			});
			if (!respuesta.ok) {
				const { error }: { error?: string } = await respuesta.json().catch(() => ({}));
				throw new Error(error);
			}
			await invalidateAll();
			toast.success(metodo === 'POST' ? 'Imagen actualizada' : 'Imagen quitada');
		} catch (error) {
			toast.error((error as Error).message || 'No se pudo actualizar la imagen');
		} finally {
			subiendo = false;
		}
	}
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo={insumo.nombre}
		subtitulo={[insumo.codigo, insumo.tipo?.nombre].filter(Boolean).join(' · ')}
		volver={{ href: '/insumos', etiqueta: 'Insumos' }}
		eliminar={{
			modulo: 'insumos',
			mensaje: `¿Eliminar el insumo ${insumo.nombre}? Deja de aparecer en el catálogo.`,
			onConfirmar: async () => {
				await eliminarInsumo(insumo.id);
				toast.success('Insumo eliminado');
				goto(resolve('/insumos'));
			}
		}}
	/>

	<section class="flex flex-col gap-5 seccion sm:flex-row sm:items-center">
		<div class="group relative size-28 shrink-0 overflow-hidden rounded-box border border-base-300">
			{#if insumo.imagen_key}
				<img src={urlImagen} alt="Imagen de {insumo.nombre}" class="size-full object-cover" />
			{:else}
				<div class="grid size-full place-items-center bg-base-200 text-xs text-base-content/50">
					Sin imagen
				</div>
			{/if}
			<Can modulo="insumos" accion="edit">
				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-content/60 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
				>
					<label class="btn btn-xs">
						{subiendo ? 'Subiendo...' : insumo.imagen_key ? 'Cambiar' : 'Subir'}
						<input
							type="file"
							class="hidden"
							accept="image/jpeg,image/png,image/webp"
							disabled={subiendo}
							onchange={(e) => {
								const archivo = e.currentTarget.files?.[0];
								if (archivo) void imagen('POST', archivo);
							}}
						/>
					</label>
					{#if insumo.imagen_key}
						<button
							type="button"
							class="btn btn-ghost text-base-100 btn-xs"
							onclick={() => imagen('DELETE')}>Quitar</button
						>
					{/if}
				</div>
			</Can>
		</div>

		<dl class="datos flex-1">
			<div>
				<dt>Stock</dt>
				{#if insumo.controla_stock}
					<dd class={['text-xl font-semibold tabular-nums', insumo.stock <= 0 && 'text-error']}>
						{cantidad(insumo.stock)} <span class="text-sm font-normal">{insumo.unidad}</span>
					</dd>
				{:else}
					<dd class="text-base-content/60">No lleva stock · se registran horas</dd>
				{/if}
			</div>
			<div>
				<dt>Costo final</dt>
				<dd class="text-xl font-semibold tabular-nums">
					{formatearMoneda(insumo.costo_unitario)}
					<span class="secundario block font-normal">por {insumo.unidad}</span>
				</dd>
			</div>
			<div>
				<dt>Proveedor</dt>
				<dd>{insumo.proveedor?.nombre ?? 'Sin proveedor'}</dd>
			</div>
			<div>
				<dt>Categoría</dt>
				<dd>{insumo.categoria?.nombre ?? 'Sin categoría'}</dd>
			</div>
		</dl>
	</section>

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
		<Can modulo="insumos" accion="edit">
			<form
				{...form.enhance(async (instancia) => {
					try {
						if (await instancia.submit()) {
							await invalidateAll();
							toast.success('Insumo actualizado');
						} else toast.error('Revisá los datos del insumo');
					} catch {
						toast.error('No se pudo actualizar el insumo');
					}
				})}
				class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2"
			>
				<input type="hidden" name="id" value={insumo.id} />
				<Seccion titulo="Datos del insumo">
					<div class="grid gap-4 sm:grid-cols-2">
						<FormFieldWrapper label="Descripción" id="nombre" required class="sm:col-span-2">
							<input id="nombre" class="input" {...form.fields.nombre.as('text', insumo.nombre)} />
						</FormFieldWrapper>
						<FormFieldWrapper label="Código" id="codigo" required>
							<input
								id="codigo"
								class="input font-mono"
								{...form.fields.codigo.as('text', insumo.codigo)}
							/>
						</FormFieldWrapper>
						<FormFieldWrapper label="Unidad" id="unidad" required>
							<select
								id="unidad"
								class="select"
								{...form.fields.unidad.as('select', insumo.unidad_id?.toString() ?? '')}
							>
								{#each await getUnidadesInsumo() as unidad (unidad.id)}
									<option value={String(unidad.id)}>{unidad.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
						<FormFieldWrapper label="Tipo" id="tipo">
							<select
								id="tipo"
								class="select"
								{...form.fields.tipo.as('select', insumo.tipo?.id?.toString() ?? '')}
							>
								{#each await getTiposInsumo() as tipo (tipo.id)}
									<option value={String(tipo.id)}>{tipo.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
						<FormFieldWrapper label="Categoría" id="categoria_id">
							<select
								id="categoria_id"
								class="select"
								{...form.fields.categoria_id.as('select', insumo.categoria_id?.toString() ?? '')}
							>
								<option value="">Sin categoría</option>
								{#each await getCategoriasInsumo() as categoria (categoria.id)}
									<option value={String(categoria.id)}>{categoria.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
						<FormFieldWrapper label="Proveedor" id="proveedor_id" class="sm:col-span-2">
							<select
								id="proveedor_id"
								class="select"
								{...form.fields.proveedor_id.as('select', insumo.proveedor_id?.toString() ?? '')}
							>
								<option value="">Sin proveedor</option>
								{#each await obtenerProveedores() as proveedor (proveedor.id)}
									<option value={String(proveedor.id)}>{proveedor.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					</div>
				</Seccion>

				<Seccion
					titulo="Costo"
					descripcion="El costo final (con flete) es el que usan las recetas."
				>
					<div class="grid gap-4 sm:grid-cols-3">
						<FormFieldWrapper label="Costo base" id="costo_unitario" required>
							<input
								id="costo_unitario"
								class="input"
								min="0"
								step="0.01"
								{...form.fields.costo_unitario.as(
									'number',
									insumo.costo_unitario / (1 + (insumo.flete_porcentaje ?? 0) / 100)
								)}
							/>
						</FormFieldWrapper>
						<FormFieldWrapper label="Flete (%)" id="flete_porcentaje">
							<input
								id="flete_porcentaje"
								class="input"
								min="0"
								step="0.01"
								{...form.fields.flete_porcentaje.as('number', insumo.flete_porcentaje ?? 0)}
							/>
						</FormFieldWrapper>
						<div class="campo">
							<span class="text-sm font-medium text-base-content/80">Costo final</span>
							<p class="flex h-10 items-center text-lg font-semibold tabular-nums">
								{formatearMoneda(costoFinal)}
							</p>
						</div>
					</div>
				</Seccion>

				<FormErrors {form} />
				<FormActions
					cancelHref={resolve('/insumos')}
					pending={!!form.pending}
					submitText="Guardar cambios"
				/>
			</form>
		</Can>

		<aside class="flex min-w-0 flex-col gap-4 sm:gap-6">
			<Seccion titulo="Usado en" descripcion="Productos cuya receta lleva este insumo.">
				{#if insumo.usos.length}
					<ul class="-my-1 divide-y divide-base-300">
						{#each insumo.usos as uso (uso.id)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<a class="min-w-0 hover:text-primary" href={resolve(`/productos/${uso.id}`)}>
									<p class="truncate font-medium">{uso.nombre}</p>
									<p class="secundario font-mono">{uso.codigo}</p>
								</a>
								<span class="shrink-0 text-base-content/70 tabular-nums">
									{cantidad(uso.cantidad)}
									{insumo.unidad}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-base-content/60">No se usa en ninguna receta.</p>
				{/if}
			</Seccion>

			<Seccion titulo="Últimos movimientos">
				{#snippet acciones()}
					<a class="link text-sm link-primary" href={resolve('/insumos/movimientos')}>Ver todos</a>
				{/snippet}
				{#if data.movimientos.length}
					<ul class="-my-1 divide-y divide-base-300">
						{#each data.movimientos as movimiento (movimiento.id)}
							{@const entra = ['ingreso', 'ajuste_entrada'].includes(movimiento.tipo)}
							<li class="flex items-start justify-between gap-3 py-2 text-sm">
								<div class="min-w-0">
									<p class="font-medium">
										{ETIQUETAS_MOVIMIENTO_INSUMO[movimiento.tipo] ?? movimiento.tipo}
										{#if movimiento.orden_fabricacion_id}
											<span class="secundario">· OF-{movimiento.orden_fabricacion_id}</span>
										{/if}
									</p>
									<p class="secundario truncate">
										{formatearFecha(movimiento.created_at)} · {movimiento.empleado.nombre} · {movimiento.motivo}
									</p>
								</div>
								<span
									class={[
										'shrink-0 font-medium tabular-nums',
										entra ? 'text-success' : 'text-base-content/70'
									]}
								>
									{entra ? '+' : '−'}{cantidad(movimiento.cantidad)}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-base-content/60">Sin movimientos registrados.</p>
				{/if}
			</Seccion>
		</aside>
	</div>
</PageLayout>
