<script lang="ts">
	import {
		getModelos,
		getCategoriasComp,
		actualizarProducto,
		eliminarProducto,
		getAtributosCategoria,
		getProductos
	} from '$lib/modulos/productos/productos.remote';
	import AtributosCampos from '$lib/modulos/productos/componentes/AtributosCampos.svelte';
	import {
		Can,
		EncabezadoDetalle,
		FormErrors,
		Icono,
		PageLayout,
		FormFieldWrapper,
		FormActions,
		SearchSelect,
		Seccion
	} from '$lib/ui';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { calcularPrecioVenta, formatearMoneda, redondearPrecio } from '$lib/utils/precios';
	import type { PageProps } from './$types';
	import { CATEGORIAS_PRODUCTO, TIPOS_USO_PRODUCTO } from '$lib/modulos/productos/tipos';
	import { formatearAnios } from '$lib/modulos/productos/anios';

	let { data }: PageProps = $props();

	const adjuntos = $derived(data.producto.adjuntos);
	const portada = $derived(adjuntos.find((a) => a.categoria === 'portada'));
	const planos = $derived(adjuntos.filter((a) => a.categoria === 'plano'));
	const archivos = $derived(adjuntos.filter((a) => a.categoria === 'general'));
	let subiendoPortada = $state(false);

	async function subirPortada(archivo: File | undefined) {
		if (!archivo) return;
		subiendoPortada = true;
		const cuerpo = new FormData();
		cuerpo.set('tipo', 'producto');
		cuerpo.set('entidad_id', String(data.producto.id));
		cuerpo.set('accion', 'edit');
		cuerpo.set('categoria', 'portada');
		cuerpo.append('archivos', archivo);
		try {
			const respuesta = await fetch(resolve('/adjuntos'), { method: 'POST', body: cuerpo });
			const resultado = await respuesta.json().catch(() => null);
			const fallo = resultado?.error ?? resultado?.resultados?.[0]?.error;
			if (!respuesta.ok || fallo) throw new Error(fallo);
			await invalidateAll();
			toast.success('Portada actualizada');
		} catch (error) {
			toast.error((error as Error).message || 'No se pudo subir la portada');
		} finally {
			subiendoPortada = false;
		}
	}

	let categorias: { id: number; nombre: string; slug: string }[] = page.data.categorias;
	let tiposVehiculo = page.data.tiposVehiculo;
	let marcas = page.data.marcas;

	let tiposUso: { id: number; nombre: string; slug: string }[] = page.data.tiposDeUso;

	let form = $derived(actualizarProducto.for(String(data.producto.id)));

	let categoriaActual = $derived(
		form.fields.categoria_id.value() ??
			(data.producto.categoria_id == null ? '' : String(data.producto.categoria_id))
	);
	let tipoVehiculoActual = $derived(
		form.fields.tipo_vehiculo_id.value() ??
			(data.producto.tipo_vehiculo_id == null ? '' : String(data.producto.tipo_vehiculo_id))
	);
	let marcaActual = $derived(
		form.fields.marca_id.value() ??
			(data.producto.marca_id == null ? '' : String(data.producto.marca_id))
	);
	let tipoUsoActual = $derived(
		form.fields.tipo_uso_id.value() ?? String(data.producto.tipo_uso_id)
	);
	let categoriaSeleccionada = $derived(
		categorias.find((categoria) => String(categoria.id) === categoriaActual)
	);
	let valoresAtributos = $derived({ ...data.producto.atributos });
	const definiciones = $derived(
		categoriaActual ? await getAtributosCategoria(Number(categoriaActual)) : []
	);
	let tipoUsoSeleccionado = $derived(
		tiposUso.find((tipoUso) => String(tipoUso.id) === tipoUsoActual)
	);

	const mapearReceta = () =>
		(data.receta ?? []).map((linea) => ({
			insumo_id: linea.insumo_id ? String(linea.insumo_id) : '',
			producto_id: linea.producto_id ? String(linea.producto_id) : '',
			cantidad: linea.cantidad
		}));
	let receta = $derived(mapearReceta());
	let opcionesComponentes = $derived.by(() => {
		const opciones: Record<string, { value: string; label: string }> = {};
		for (const insumo of data.insumos) {
			const value = `insumo:${insumo.id}`;
			opciones[value] = {
				value: `insumo:${insumo.id}`,
				label: `${insumo.codigo} - ${insumo.nombre}`
			};
		}
		for (const producto of data.productos) {
			if (producto.id === data.producto.id) continue;
			const value = `producto:${producto.id}`;
			opciones[value] = {
				value: `producto:${producto.id}`,
				label: `${producto.codigo} - ${producto.nombre}`
			};
		}
		for (const linea of data.receta ?? []) {
			if (linea.insumo_id) {
				const value = `insumo:${linea.insumo_id}`;
				opciones[value] = {
					value,
					label: `${linea.codigo ?? ''} - ${linea.nombre ?? 'Insumo'}`
				};
			} else if (linea.producto_id) {
				const value = `producto:${linea.producto_id}`;
				opciones[value] = {
					value,
					label: `${linea.codigo ?? ''} - ${linea.nombre ?? 'Producto'}`
				};
			}
		}
		return Object.values(opciones);
	});
	let costoReceta = $derived(
		redondearPrecio(
			receta.reduce((total, linea) => {
				const insumo = data.insumos.find((item) => item.id === Number(linea.insumo_id));
				const producto = data.productos.find((item) => item.id === Number(linea.producto_id));
				return (
					total +
					(insumo?.costo_unitario ?? producto?.costo_materiales ?? 0) * Number(linea.cantidad || 0)
				);
			}, 0)
		)
	);
	let margenPorcentajeActual = $derived(
		Number(form.fields.margen_porcentaje.value() ?? data.producto.margen_porcentaje ?? 0)
	);
	let precioVenta = $derived(calcularPrecioVenta(costoReceta, margenPorcentajeActual));

	function agregarInsumo() {
		receta = [...receta, { insumo_id: '', producto_id: '', cantidad: 1 }];
	}

	function actualizarLinea(indice: number, cambios: Partial<(typeof receta)[number]>) {
		receta = receta.map((linea, i) => (i === indice ? { ...linea, ...cambios } : linea));
	}

	const nombreDe = (lista: { id: number; nombre: string }[], id: number | null) =>
		lista.find((item) => item.id === id)?.nombre;
	const vehiculo = $derived(
		[
			nombreDe(tiposVehiculo, data.producto.tipo_vehiculo_id),
			nombreDe(marcas, data.producto.marca_id),
			formatearAnios(data.producto.anio_desde, data.producto.anio_hasta)
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo={data.producto.nombre}
		subtitulo={[data.producto.codigo, categoriaSeleccionada?.nombre].filter(Boolean).join(' · ')}
		volver={{ href: '/productos', etiqueta: 'Productos' }}
		eliminar={{
			modulo: 'productos',
			mensaje: `¿Eliminar el producto ${data.producto.nombre}?`,
			onConfirmar: async () => {
				await eliminarProducto(data.producto.id).updates(getProductos);
				toast.success('Producto eliminado');
				goto(resolve('/productos'));
			}
		}}
	/>

	<section class="flex flex-col gap-5 seccion sm:flex-row">
		<div
			class="group relative aspect-square w-full shrink-0 overflow-hidden rounded-box border border-base-300 bg-base-200 sm:w-48"
		>
			{#if portada}
				<img
					src={resolve(`/adjuntos/${portada.id}`)}
					alt="Portada de {data.producto.nombre}"
					class="size-full object-cover"
				/>
			{:else}
				<div class="grid size-full place-items-center p-4 text-center text-sm text-base-content/50">
					Sin imagen de portada
				</div>
			{/if}
			<Can modulo="productos" accion="edit">
				<label
					class="btn absolute inset-x-2 bottom-2 opacity-0 transition-opacity btn-sm group-focus-within:opacity-100 group-hover:opacity-100"
				>
					{subiendoPortada ? 'Subiendo...' : portada ? 'Cambiar portada' : 'Subir portada'}
					<input
						type="file"
						class="hidden"
						accept="image/jpeg,image/png,image/webp"
						disabled={subiendoPortada}
						onchange={(e) => subirPortada(e.currentTarget.files?.[0])}
					/>
				</label>
			</Can>
		</div>

		<div class="flex min-w-0 flex-1 flex-col justify-between gap-4">
			<dl class="datos">
				<div>
					<dt>Categoría</dt>
					<dd>{categoriaSeleccionada?.nombre ?? 'Sin categoría'}</dd>
				</div>
				<div>
					<dt>Vehículo</dt>
					<dd>{vehiculo || '-'}</dd>
				</div>
				<div>
					<dt>Uso</dt>
					<dd>{tipoUsoSeleccionado?.nombre ?? '-'}</dd>
				</div>
				<div>
					<dt>Planos</dt>
					<dd>{planos.length || 'Sin planos'}</dd>
				</div>
			</dl>
			<dl class="grid grid-cols-3 gap-4 border-t border-base-300 pt-4">
				<div>
					<dt class="secundario">Costo de receta</dt>
					<dd class="text-lg font-semibold tabular-nums">{formatearMoneda(costoReceta)}</dd>
				</div>
				<div>
					<dt class="secundario">Margen</dt>
					<dd class="text-lg font-semibold tabular-nums">{margenPorcentajeActual}%</dd>
				</div>
				<div>
					<dt class="secundario">Precio de lista</dt>
					<dd class="text-lg font-semibold text-primary tabular-nums">
						{formatearMoneda(precioVenta)}
					</dd>
				</div>
			</dl>
		</div>
	</section>

	<Can modulo="productos" accion="edit">
		<form
			{...form.enhance(async (instancia) => {
				try {
					if (await instancia.submit()) {
						await invalidateAll();
						toast.success('Producto actualizado');
					} else toast.error('Revisá los datos del producto');
				} catch {
					toast.error('No se pudo actualizar el producto. Revisá la receta e intentá de nuevo.');
				}
			})}
			class="flex flex-col gap-4 sm:gap-6"
		>
			<input type="hidden" name="id" value={page.params.id} />
			<input type="hidden" name="receta" value={JSON.stringify(receta)} />

			<Seccion titulo="Datos generales">
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<FormFieldWrapper label="Código" id="codigo" required>
						<input
							id="codigo"
							class="input font-mono"
							{...form.fields.codigo.as('text', data.producto.codigo)}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper label="Nombre" id="nombre" required class="lg:col-span-2">
						<input
							id="nombre"
							class="input"
							{...form.fields.nombre.as('text', data.producto.nombre)}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper label="Categoría" id="categoria_id">
						<select
							id="categoria_id"
							class="select"
							{...form.fields.categoria_id.as('select', String(data.producto.categoria_id))}
						>
							<option value="">Seleccionar...</option>
							{#each categorias as cat (cat.id)}
								<option value={String(cat.id)}>{cat.nombre}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>
			</Seccion>

			{#if categoriaSeleccionada?.slug === CATEGORIAS_PRODUCTO.ESCAPES}
				<Seccion titulo="Vehículo">
					<div class="grid gap-4 sm:grid-cols-3">
						<FormFieldWrapper label="Tipo" id="tipo_vehiculo_id">
							<select
								{...form.fields.tipo_vehiculo_id.as(
									'select',
									String(data.producto.tipo_vehiculo_id)
								)}
								class="select w-full"
							>
								<option value="">Seleccionar...</option>
								{#each tiposVehiculo as tv (tv.id)}
									<option value={String(tv.id)}>{tv.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>

						<FormFieldWrapper label="Marca" id="marca_id">
							<select
								{...form.fields.marca_id.as('select', String(data.producto.marca_id))}
								class="select w-full"
								disabled={!tipoVehiculoActual}
							>
								<option value="">Seleccionar...</option>
								{#each marcas as m (m.id)}
									<option value={String(m.id)}>
										{#if m.logo_url}<img
												src={m.logo_url}
												alt={m.nombre}
												class="h-5 w-5 object-contain"
											/>
										{/if}
										{m.nombre}</option
									>
								{/each}
							</select>
						</FormFieldWrapper>

						<FormFieldWrapper label="Modelo" id="modelo_id">
							<select
								{...form.fields.modelo_id.as('select', String(data.producto.modelo_id))}
								class="select w-full"
								disabled={!marcaActual}
							>
								<option value="">Seleccionar...</option>
								{#each marcaActual ? await getModelos(Number(marcaActual)) : [] as mod (mod.id)}
									<option value={String(mod.id)}>{mod.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<FormFieldWrapper
							label="Año desde"
							id="anio_desde"
							error={form.fields.anio_desde.issues()?.[0]?.message}
						>
							<input
								{...form.fields.anio_desde.as('number', data.producto.anio_desde ?? '')}
								id="anio_desde"
								class="input w-full"
								min="1900"
								max="2100"
								step="1"
								placeholder="Ej: 2010"
							/>
						</FormFieldWrapper>
						<FormFieldWrapper
							label="Año hasta"
							id="anio_hasta"
							ayuda="Vacío si sigue vigente"
							error={form.fields.anio_hasta.issues()?.[0]?.message}
						>
							<input
								{...form.fields.anio_hasta.as('number', data.producto.anio_hasta ?? '')}
								id="anio_hasta"
								class="input w-full"
								min="1900"
								max="2100"
								step="1"
								placeholder="Ej: 2016"
							/>
						</FormFieldWrapper>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<FormFieldWrapper label="Tipo de uso" id="tipo_uso_id">
							<select
								{...form.fields.tipo_uso_id.as('select', String(data.producto.tipo_uso_id))}
								class="select w-full"
							>
								<option value="">Seleccionar...</option>
								{#each tiposUso as tu (tu.id)}
									<option value={String(tu.id)}>{tu.nombre}</option>
								{/each}
							</select>
						</FormFieldWrapper>

						{#if tipoUsoSeleccionado?.slug === TIPOS_USO_PRODUCTO.COMPETENCIA}
							<FormFieldWrapper label="Categoría de competencia" id="categoria_competencia_id">
								<select
									{...form.fields.categoria_competencia_id.as(
										'select',
										String(data.producto.categoria_competencia_id)
									)}
									class="select w-full"
								>
									<option value="">Seleccionar...</option>
									{#each tipoVehiculoActual ? await getCategoriasComp(Number(tipoVehiculoActual)) : [] as cat (cat.id)}
										<option value={String(cat.id)}>{cat.nombre}</option>
									{/each}
								</select>
							</FormFieldWrapper>
						{/if}
					</div>
				</Seccion>
			{/if}

			{#if definiciones.length}
				<Seccion titulo="Medidas">
					<AtributosCampos {definiciones} bind:valores={valoresAtributos} />
				</Seccion>
			{/if}

			<Seccion titulo="Receta" descripcion="Insumos y subproductos que lleva cada unidad.">
				{#snippet acciones()}
					<span class="text-sm text-base-content/70">
						Costo: <strong class="tabular-nums">{formatearMoneda(costoReceta)}</strong>
					</span>
				{/snippet}
				<div class="flex flex-col gap-1">
					{#each receta as linea, indice (indice)}
						{@const unidad =
							data.insumos.find((insumo) => String(insumo.id) === linea.insumo_id)?.unidad ??
							(linea.producto_id ? 'Producto' : '-')}
						<div class="mb-1 grid grid-cols-[minmax(0,1fr)_4rem_5rem_2rem] gap-1 sm:items-center">
							<SearchSelect
								compacto
								label=""
								id={`receta-edit-${indice}`}
								placeholder="Buscar componente..."
								field={{
									value: () =>
										linea.insumo_id
											? `insumo:${linea.insumo_id}`
											: linea.producto_id
												? `producto:${linea.producto_id}`
												: '',
									set: (value: string) => {
										const [tipo, id] = value.split(':');
										actualizarLinea(indice, {
											insumo_id: tipo === 'insumo' ? id : '',
											producto_id: tipo === 'producto' ? id : ''
										});
									}
								}}
								options={opcionesComponentes}
							/>
							<input
								class="input w-16 input-sm"
								type="number"
								min="0"
								step="0.01"
								value={linea.cantidad}
								oninput={(event) =>
									actualizarLinea(indice, {
										cantidad: Number(event.currentTarget.value) || 0
									})}
							/>
							<span
								class="label w-20 min-w-0 justify-start truncate whitespace-nowrap"
								title={unidad}
								>{unidad}
							</span>
							<button
								class="btn btn-square btn-ghost text-error btn-sm"
								title="Quitar componente"
								aria-label="Quitar componente"
								type="button"
								onclick={() => (receta = receta.filter((_, i) => i !== indice))}
								><Icono nombre="papelera" /></button
							>
						</div>
					{/each}
				</div>
				<div class="flex items-center gap-4">
					<button class="btn btn-sm" type="button" onclick={agregarInsumo}>
						<Icono nombre="mas_simple" /> Agregar componente
					</button>
					<FormFieldWrapper label="Margen (%)" id="margen_porcentaje" class="ml-auto w-32">
						<input
							id="margen_porcentaje"
							class="input input-sm"
							min="0"
							max="99.99"
							step="0.01"
							{...form.fields.margen_porcentaje.as('number', data.producto.margen_porcentaje ?? 0)}
						/>
					</FormFieldWrapper>
				</div>
			</Seccion>

			<Seccion titulo="Notas de fabricación">
				<textarea
					id="notas_fabricacion"
					class="textarea w-full"
					rows={3}
					{...form.fields.notas_fabricacion.as('text', data.producto.notas_fabricacion ?? '')}
				></textarea>
			</Seccion>

			<FormErrors {form} />
			<FormActions
				cancelHref={resolve('/productos')}
				pending={!!form.pending}
				submitText="Guardar cambios"
			/>
		</form>
	</Can>

	<div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
		<ArchivosAdjuntos
			tipo="producto"
			entidadId={data.producto.id}
			adjuntos={planos}
			categoria="plano"
			titulo="Planos"
			descripcion="Se imprimen en la orden de fabricación."
			vacio="Todavía no hay planos."
		/>
		<ArchivosAdjuntos
			tipo="producto"
			entidadId={data.producto.id}
			adjuntos={archivos}
			titulo="Fotos y archivos"
			descripcion="Proceso de fabricación, producto instalado y otras referencias."
			vacio="Todavía no hay archivos."
		/>
	</div>
</PageLayout>
