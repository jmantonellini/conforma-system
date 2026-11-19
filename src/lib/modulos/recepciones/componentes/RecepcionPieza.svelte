<script lang="ts">
	import { page } from '$app/state';
	import { FormErrors, FormFieldWrapper, Icono, Modal, Seccion } from '$lib/ui';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';
	import type { Adjunto } from '$lib/modulos/adjuntos/tipos';
	import { getNombresTransportistas } from '$lib/modulos/pedidos/transportistas.remote';
	import { getRecepcion, guardarRecepcion } from '$lib/modulos/recepciones/recepciones.remote';
	import { fechaInput, formatearFecha } from '$lib/utils/fechas';
	import { can } from '$lib/utils/permissions';
	import { formatearMoneda } from '$lib/utils/precios';
	import { toast } from '$lib/ui/toast.svelte';

	type Dueno = { tipo: 'cotizacion' | 'pedido'; id: number };

	let {
		cotizacionId = null,
		pedidoId = null,
		dueno,
		adjuntos,
		esperada,
		soloLectura = false
	}: {
		cotizacionId?: number | null;
		pedidoId?: number | null;
		dueno: Dueno;
		adjuntos: Adjunto[];
		esperada: boolean;
		soloLectura?: boolean;
	} = $props();

	const consulta = $derived(getRecepcion({ cotizacionId, pedidoId }));
	const recepcion = $derived(await consulta);
	const fotos = $derived(adjuntos.filter((adjunto) => adjunto.categoria === 'recepcion'));
	const destino = $derived<Dueno>(
		recepcion
			? recepcion.pedido_id
				? { tipo: 'pedido', id: recepcion.pedido_id }
				: { tipo: 'cotizacion', id: recepcion.cotizacion_id! }
			: dueno
	);
	const puedeEditar = $derived(
		!soloLectura &&
			(destino.tipo === 'pedido'
				? can(page.data.user, page.data.permisos, 'pedidos', 'edit')
				: can(page.data.user, page.data.permisos, 'cotizaciones', 'edit') ||
					can(page.data.user, page.data.permisos, 'cotizaciones', 'create'))
	);
	const visible = $derived(esperada || Boolean(recepcion) || fotos.length > 0);
	const veImportes = $derived(can(page.data.user, page.data.permisos, 'importes', 'view'));

	let abierto = $state(false);
	const form = guardarRecepcion;
	const transportistas = $derived(abierto ? await getNombresTransportistas() : []);

	function cerrar() {
		abierto = false;
		form.element?.reset();
	}
</script>

{#if visible}
	<Seccion
		titulo="Pieza del cliente"
		descripcion="Estado en que llegó la pieza, como respaldo ante reclamos."
	>
		{#snippet acciones()}
			{#if puedeEditar}
				<button class="btn btn-sm" onclick={() => (abierto = true)}>
					{recepcion ? 'Editar' : 'Registrar llegada'}
				</button>
			{/if}
		{/snippet}

		{#if recepcion}
			<dl class="datos">
				<div>
					<dt>Llegó el</dt>
					<dd>{formatearFecha(recepcion.fecha_recepcion)}</dd>
				</div>
				{#if recepcion.recibido_por}
					<div>
						<dt>Recibió</dt>
						<dd>{recepcion.recibido_por}</dd>
					</div>
				{/if}
				{#if recepcion.llego_por || recepcion.numero_guia}
					<div>
						<dt>Llegó por</dt>
						<dd>
							{[recepcion.llego_por, recepcion.numero_guia && `guía ${recepcion.numero_guia}`]
								.filter(Boolean)
								.join(' · ')}
						</dd>
					</div>
				{/if}
				{#if recepcion.flete_pagado}
					<div>
						<dt>Flete pagado al recibir</dt>
						<dd>
							{formatearMoneda(recepcion.flete_pagado, 'ARS')}
							<span class="secundario">· sumado al trabajo</span>
						</dd>
					</div>
				{/if}
				<div class="col-span-full">
					<dt>Estado de la pieza</dt>
					<dd class="whitespace-pre-wrap">{recepcion.estado_pieza}</dd>
				</div>
			</dl>
		{:else}
			<div role="alert" class="alert flex items-start alert-soft py-2 text-sm alert-warning">
				<Icono nombre="camara" class="size-4" />
				<span>
					Todavía no se registró la llegada de la pieza. Cuando llegue, anotá cómo vino y sacale
					fotos antes de trabajarla.
				</span>
			</div>
		{/if}

		<ArchivosAdjuntos
			tipo={destino.tipo}
			entidadId={destino.id}
			adjuntos={fotos}
			categoria="recepcion"
			vacio="Sin fotos de la pieza."
			seccion={false}
			soloLectura={!puedeEditar}
		/>
	</Seccion>
{/if}

{#if puedeEditar}
	<Modal
		bind:open={abierto}
		titulo={recepcion ? 'Editar llegada de la pieza' : 'Registrar llegada de la pieza'}
		alCerrar={cerrar}
		accion={{ etiqueta: 'Guardar', form: 'recepcion-form', pendiente: !!form.pending }}
	>
		<form
			{...form.enhance(async (f) => {
				if (await f.submit()) {
					await consulta.refresh();
					toast.success('Llegada de la pieza registrada');
					if (form.result?.flete) toast.info(form.result.flete);
					cerrar();
				}
			})}
			id="recepcion-form"
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="tipo" value={destino.tipo} />
			<input type="hidden" name="entidad_id" value={destino.id} />
			{#if recepcion}<input type="hidden" name="recepcion_id" value={recepcion.id} />{/if}
			<div class="grid gap-4 sm:grid-cols-2">
				<FormFieldWrapper label="Fecha de llegada" id="recepcion-fecha" required>
					<input
						id="recepcion-fecha"
						class="input w-full"
						max={fechaInput()}
						{...form.fields.fecha_recepcion.as(
							'date',
							fechaInput(recepcion?.fecha_recepcion ?? new Date())
						)}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper label="Llegó por" id="recepcion-llego-por">
					<input
						id="recepcion-llego-por"
						class="input w-full"
						list="recepcion-transportistas"
						autocomplete="off"
						placeholder="Transportista o la trajo el cliente"
						{...form.fields.llego_por.as('text', recepcion?.llego_por ?? '')}
					/>
					<datalist id="recepcion-transportistas">
						{#each transportistas as nombre (nombre)}
							<option value={nombre}></option>
						{/each}
					</datalist>
				</FormFieldWrapper>
				<FormFieldWrapper label="N° de guía" id="recepcion-guia">
					<input
						id="recepcion-guia"
						class="input w-full"
						{...form.fields.numero_guia.as('text', recepcion?.numero_guia ?? '')}
					/>
				</FormFieldWrapper>
				{#if veImportes}
					<FormFieldWrapper
						label="Flete pagado al recibir ($)"
						id="recepcion-flete"
						ayuda="Si llegó con flete a pagar, se suma solo como ítem al trabajo para cobrárselo. Borralo para quitarlo."
					>
						<input
							id="recepcion-flete"
							class="input w-full"
							inputmode="decimal"
							placeholder="Ej: 15000"
							{...form.fields.flete_pagado.as('text', recepcion?.flete_pagado?.toString() ?? '')}
						/>
					</FormFieldWrapper>
				{/if}
			</div>
			<FormFieldWrapper
				label="Estado en que llegó"
				id="recepcion-estado"
				required
				ayuda="Golpes, fisuras, piezas faltantes, óxido, soldaduras previas. Después subí las fotos."
			>
				<textarea
					id="recepcion-estado"
					class="textarea w-full"
					rows="4"
					{...form.fields.estado_pieza.as('text', recepcion?.estado_pieza ?? '')}></textarea>
			</FormFieldWrapper>
			<FormErrors {form} />
		</form>
	</Modal>
{/if}
