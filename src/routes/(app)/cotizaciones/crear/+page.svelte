<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ContactoRapido from '$lib/modulos/contactos/componentes/ContactoRapido.svelte';
	import {
		Can,
		EncabezadoDetalle,
		FormActions,
		FormErrors,
		FormFieldWrapper,
		Icono,
		PageLayout,
		SearchSelect,
		Seccion
	} from '$lib/ui';
	import type { Option } from '$lib/ui/SearchSelect.svelte';
	import { obtenerContactosCliente } from '$lib/modulos/contactos/contactos.remote';
	import { crearCotizacion } from '$lib/modulos/cotizaciones/cotizaciones.remote';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import { toast } from '$lib/ui/toast.svelte';
	import { CANALES_COTIZACION } from '$lib/modulos/cotizaciones/canales';
	import { formatearCuit } from '$lib/utils/cuit';
	import { can } from '$lib/utils/permissions';

	type Contacto = {
		id: number;
		razon_social: string;
		telefono: string | null;
		email: string | null;
		cuit: string | null;
		es_distribuidor?: boolean | null;
	};

	const form = crearCotizacion;
	const LIMITE = 50;
	const ARCHIVOS_ACEPTADOS =
		'image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf';
	const puedeAsignar = can(page.data.user, page.data.permisos, 'cotizaciones', 'edit');

	const [iniciales, empleados] = await Promise.all([
		obtenerContactosCliente({ limit: LIMITE }),
		puedeAsignar ? getEmpleadosOpciones() : Promise.resolve([])
	]);

	const conocidos = new SvelteMap<string, Contacto>();
	const recordar = (lista: Contacto[]) => {
		for (const contacto of lista) conocidos.set(String(contacto.id), contacto);
		return lista;
	};
	const opcion = (c: Contacto): Option => ({
		value: String(c.id),
		label: c.razon_social,
		detalle: [c.telefono, c.email, c.cuit && formatearCuit(c.cuit)].filter(Boolean).join(' · ')
	});

	let clientes = $state(recordar(iniciales.data).map(opcion));
	let distribuidores = $state(iniciales.data.filter((c) => c.es_distribuidor).map(opcion));
	const cliente = $derived(conocidos.get(form.fields.contacto_id.value() ?? ''));

	let altaContacto: ContactoRapido;

	if (!form.fields.canal.value()) form.fields.canal.set('whatsapp');

	let ultimaBusqueda = { cliente: 0, distribuidor: 0 };
	async function buscar(texto: string, tipo: 'cliente' | 'distribuidor') {
		const solicitud = ++ultimaBusqueda[tipo];
		const { data } = await obtenerContactosCliente({
			search: texto || undefined,
			soloDistribuidores: tipo === 'distribuidor' || undefined,
			limit: LIMITE
		});
		if (solicitud !== ultimaBusqueda[tipo]) return;
		const opciones = recordar(data).map(opcion);
		if (tipo === 'cliente') clientes = opciones;
		else distribuidores = opciones;
	}

	function contactoCreado(contacto: Contacto) {
		recordar([contacto]);
		const nueva = opcion(contacto);
		clientes = [nueva, ...clientes.filter((item) => item.value !== nueva.value)];
		form.fields.contacto_id.set(nueva.value);
	}

	type Adjunto = { archivo: File; vista: string };
	let adjuntos = $state<Adjunto[]>([]);
	let subiendo = $state(false);

	function agregar(archivos: FileList | null) {
		for (const archivo of archivos ?? []) {
			const vista = archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : '';
			adjuntos.push({ archivo, vista });
		}
	}

	function quitar(adjunto: Adjunto) {
		if (adjunto.vista) URL.revokeObjectURL(adjunto.vista);
		adjuntos = adjuntos.filter((item) => item !== adjunto);
	}

	onDestroy(() => adjuntos.forEach((a) => a.vista && URL.revokeObjectURL(a.vista)));

	async function subirAdjuntos(cotizacionId: number) {
		if (!adjuntos.length) return;
		const cuerpo = new FormData();
		for (const { archivo } of adjuntos) cuerpo.append('archivos', archivo);
		const respuesta = await fetch(`/cotizaciones/${cotizacionId}/adjuntos`, {
			method: 'POST',
			body: cuerpo
		});
		const resultado: { error?: string; resultados?: { error?: string }[] } = await respuesta.json();
		if (!respuesta.ok || resultado.resultados?.some((item) => item.error)) {
			throw new Error(resultado.error || 'No se pudieron subir todos los archivos');
		}
	}

	const tamaño = (bytes: number) =>
		bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo="Nueva cotización"
		subtitulo="Registrá la consulta; los ítems y precios se cargan después en la cotización."
		volver={{ href: '/cotizaciones', etiqueta: 'Cotizaciones' }}
	/>

	<Can modulo="cotizaciones" accion="create">
		<form
			{...form.enhance(async (instancia) => {
				try {
					if (!(await instancia.submit())) return toast.error('Revisá los datos de la consulta');
					const id = instancia.result?.cotizacionId;
					if (!id) throw new Error();
					subiendo = true;
					try {
						await subirAdjuntos(id);
						toast.success('Cotización creada');
					} catch {
						toast.warning('Cotización creada, pero algunos archivos no se subieron.');
					} finally {
						subiendo = false;
					}
					goto(resolve(`/cotizaciones/${id}`));
				} catch {
					toast.error('No se pudo crear la cotización');
				}
			})}
			class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3"
		>
			<aside class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-start-3 lg:row-start-1">
				<Seccion titulo="Cliente">
					<SearchSelect
						id="contacto_id"
						label="Contacto"
						options={clientes}
						placeholder="Nombre, teléfono, email o CUIT..."
						field={form.fields.contacto_id}
						onSearch={(texto) => buscar(texto, 'cliente')}
						onCreate={(texto) => altaContacto.abrir(texto)}
						createLabel="Crear contacto"
					/>
					{#if cliente}
						<dl class="grid gap-1 rounded-box bg-base-200/60 p-3 text-sm">
							{#each [['Teléfono', cliente.telefono], ['Email', cliente.email], ['CUIT', cliente.cuit && formatearCuit(cliente.cuit)]] as [etiqueta, valor] (etiqueta)}
								<div class="flex justify-between gap-3">
									<dt class="text-base-content/60">{etiqueta}</dt>
									<dd class="truncate">{valor || '-'}</dd>
								</div>
							{/each}
						</dl>
					{/if}
					<SearchSelect
						id="contacto_distribuidor_id"
						label="Distribuidor (opcional)"
						options={distribuidores}
						placeholder="Si llegó por un distribuidor..."
						field={form.fields.contacto_distribuidor_id}
						onSearch={(texto) => buscar(texto, 'distribuidor')}
					/>
				</Seccion>

				{#if puedeAsignar}
					<Seccion titulo="Responsable">
						<FormFieldWrapper
							id="asignada_a"
							label="Asignar a"
							ayuda="Si la asignás ahora, pasa directo a «Asignada» y se le avisa."
						>
							<select id="asignada_a" class="select" {...form.fields.asignada_a.as('select')}>
								<option value="">Sin asignar</option>
								{#each empleados as empleado (empleado.id)}
									<option value={String(empleado.id)}>
										{empleado.nombre}
										{empleado.apellido ?? ''}
									</option>
								{/each}
							</select>
						</FormFieldWrapper>
					</Seccion>
				{/if}
			</aside>

			<div class="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2 lg:row-start-1">
				<Seccion titulo="Consulta">
					<div class="campo">
						<span class="text-sm font-medium text-base-content/80">¿Por dónde llegó?</span>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(CANALES_COTIZACION) as [valor, nombre] (valor)}
								<input
									class="btn rounded-full btn-sm"
									aria-label={nombre}
									{...form.fields.canal.as('radio', valor)}
								/>
							{/each}
						</div>
					</div>

					<FormFieldWrapper label="¿Qué pide el cliente?" id="descripcion" required>
						<textarea
							id="descripcion"
							class="textarea"
							rows="5"
							placeholder="Ej.: caño de escape completo para un Gol 2015; pregunta si lo hacemos y cuánto sale."
							{...form.fields.descripcion.as('text')}></textarea>
					</FormFieldWrapper>

					<FormFieldWrapper
						label="Notas internas"
						id="observaciones"
						ayuda="Solo las ve el equipo; no salen en el PDF."
					>
						<textarea
							id="observaciones"
							class="textarea"
							rows="2"
							{...form.fields.observaciones.as('text')}></textarea>
					</FormFieldWrapper>
				</Seccion>

				<Seccion
					titulo="Adjuntos"
					descripcion="Fotos, audios de WhatsApp, planos o PDF del cliente."
				>
					<label
						class="relative flex cursor-pointer flex-col items-center gap-1 rounded-box border border-dashed border-base-300 px-4 py-6 text-center text-sm transition-colors hover:border-primary hover:bg-base-200/50"
					>
						<Icono nombre="clip" class="size-6 text-base-content/50" />
						<span
							><span class="font-medium text-primary">Elegí archivos</span> o arrastralos acá</span
						>
						<span class="secundario">Imágenes, audio, video o PDF</span>
						<input
							type="file"
							multiple
							accept={ARCHIVOS_ACEPTADOS}
							class="absolute inset-0 cursor-pointer opacity-0"
							disabled={subiendo}
							onchange={(e) => {
								agregar(e.currentTarget.files);
								e.currentTarget.value = '';
							}}
						/>
					</label>
					{#if adjuntos.length}
						<ul class="grid gap-2 sm:grid-cols-2">
							{#each adjuntos as adjunto (adjunto)}
								<li class="flex items-center gap-3 rounded-box border border-base-300 p-2">
									{#if adjunto.vista}
										<img src={adjunto.vista} alt="" class="size-10 rounded object-cover" />
									{:else}
										<div
											class="grid size-10 place-items-center rounded bg-base-200 text-[0.625rem] font-semibold text-base-content/60 uppercase"
										>
											{adjunto.archivo.name.split('.').pop()}
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm">{adjunto.archivo.name}</p>
										<p class="secundario">{tamaño(adjunto.archivo.size)}</p>
									</div>
									<button
										type="button"
										class="btn btn-square btn-ghost btn-xs"
										aria-label="Quitar {adjunto.archivo.name}"
										disabled={subiendo}
										onclick={() => quitar(adjunto)}
									>
										<Icono nombre="cerrar" />
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</Seccion>

				<FormErrors {form} />
				<FormActions
					cancelHref={resolve('/cotizaciones')}
					pending={!!form.pending || subiendo}
					pendingText={subiendo ? 'Subiendo archivos...' : 'Creando...'}
					submitText="Crear cotización"
				/>
			</div>
		</form>
	</Can>
</PageLayout>

<ContactoRapido bind:this={altaContacto} onCreado={contactoCreado} />
