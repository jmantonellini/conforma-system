<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FormActions, FormErrors, FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { crearContacto, obtenerDatosCuitARCA } from '$lib/remote/contactos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';
	import { esCuitValido, formatearCuit } from '$lib/utils/cuit';

	type DatosCuit = NonNullable<Awaited<ReturnType<typeof obtenerDatosCuitARCA>>>;
	type CampoTexto = { value: () => string | undefined; set: (value: string) => void };

	const form = crearContacto;
	let rol = $state(page.url.searchParams.get('rol') === 'cliente' ? 'cliente' : 'ninguno');
	let esDistribuidor = $state(false);
	let porcentajeCompensacion = $state(0);
	let cuitFormateado = $state('');
	let cuitConsultado = '';

	function establecerCuit(input: HTMLInputElement, cuit: string, digitosAntesDelCursor: number) {
		form.fields.cuit.set(cuit);
		cuitFormateado = formatearCuit(cuit);
		input.value = cuitFormateado;

		const posicionCursor =
			digitosAntesDelCursor +
			Number(digitosAntesDelCursor > 2) +
			Number(digitosAntesDelCursor > 10);
		input.setSelectionRange(posicionCursor, posicionCursor);

		if (cuit !== cuitConsultado) cuitConsultado = '';
	}

	function actualizarCuit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const cuit = input.value.replace(/\D/g, '').slice(0, 11);
		const digitosAntesDelCursor = input.value
			.slice(0, input.selectionStart ?? input.value.length)
			.replace(/\D/g, '').length;
		establecerCuit(input, cuit, Math.min(digitosAntesDelCursor, cuit.length));
	}

	function eliminarDigitoCuit(event: KeyboardEvent) {
		if (event.key !== 'Backspace' && event.key !== 'Delete') return;

		const input = event.currentTarget as HTMLInputElement;
		const inicio = input.selectionStart ?? 0;
		const fin = input.selectionEnd ?? inicio;
		if (inicio !== fin) return;

		const cuit = String(form.fields.cuit.value() ?? '');
		const digitosAntesDelCursor = input.value.slice(0, inicio).replace(/\D/g, '').length;
		const indiceAEliminar =
			event.key === 'Backspace' ? digitosAntesDelCursor - 1 : digitosAntesDelCursor;
		if (indiceAEliminar < 0 || indiceAEliminar >= cuit.length) return;

		event.preventDefault();
		const actualizado = cuit.slice(0, indiceAEliminar) + cuit.slice(indiceAEliminar + 1);
		establecerCuit(
			input,
			actualizado,
			event.key === 'Backspace' ? indiceAEliminar : digitosAntesDelCursor
		);
	}

	function completarCampoVacio(campo: CampoTexto, valor?: string) {
		if (valor && !campo.value()?.trim()) campo.set(valor);
	}

	function completarCamposVacios(datos: DatosCuit) {
		const campos: [CampoTexto, string | undefined][] = [
			[form.fields.razon_social, datos.razon_social],
			[form.fields.nombre, datos.nombre],
			[form.fields.apellido, datos.apellido],
			[form.fields.pais, datos.pais],
			[form.fields.provincia, datos.provincia],
			[form.fields.ciudad, datos.ciudad],
			[form.fields.codigo_postal, datos.codigo_postal],
			[form.fields.calle, datos.calle],
			[form.fields.numero, datos.numero],
			[form.fields.piso, datos.piso],
			[form.fields.departamento, datos.departamento]
		];

		for (const [campo, valor] of campos) completarCampoVacio(campo, valor);
	}

	async function consultarCuit() {
		const cuit = String(form.fields.cuit.value() ?? '');
		if (!cuit) return;
		if (!esCuitValido(cuit)) {
			toast.error('Ingresá un CUIT válido de 11 dígitos.');
			return;
		}
		if (cuit === cuitConsultado) return;

		cuitConsultado = cuit;
		try {
			const datos = await obtenerDatosCuitARCA(cuit);
			if (String(form.fields.cuit.value() ?? '') !== cuit) return;
			if (!datos) {
				toast.warning('ARCA no encontró datos para ese CUIT.');
				return;
			}

			completarCamposVacios(datos);
			toast.success('Datos de ARCA cargados en los campos vacíos.');
		} catch {
			if (String(form.fields.cuit.value() ?? '') === cuit) {
				cuitConsultado = '';
				toast.error('No se pudo consultar ARCA. Revisá la conexión e intentá de nuevo.');
			}
		}
	}
</script>

<PageLayout>
	<a href={resolve('/contactos')} class="btn btn-ghost btn-sm">← Volver</a>
	<form
		{...form.enhance(async (instance) => {
			try {
				if (await instance.submit()) {
					form.element?.reset();
					goto(resolve('/contactos'));
					toast.success('Contacto creado');
				} else toast.error('Revisá los datos del contacto');
			} catch {
				toast.error('No se pudo crear el contacto');
			}
		})}
		class="space-y-6"
	>
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Información del contacto</legend>
			<div class="grid gap-4 md:grid-cols-3">
				<FormFieldWrapper id="cuit" label="CUIT">
					<input {...form.fields.cuit.as('text', '')} type="hidden" id="cuit-digits" />
					<input
						id="cuit"
						class="input"
						inputmode="numeric"
						maxlength="13"
						autocomplete="off"
						value={cuitFormateado}
						oninput={actualizarCuit}
						onkeydown={eliminarDigitoCuit}
						onblur={consultarCuit}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="razon_social" label="Razón social" required>
					<input class="input" {...form.fields.razon_social.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="email" label="Email">
					<input class="input" {...form.fields.email.as('email', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="nombre" label="Nombre">
					<input class="input" {...form.fields.nombre.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="apellido" label="Apellido">
					<input class="input" {...form.fields.apellido.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="telefono" label="Teléfono">
					<input class="input" {...form.fields.telefono.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="rol" label="Rol comercial">
					<select
						class="select"
						{...form.fields.rol.as('select', rol)}
						onchange={(event) => (rol = event.currentTarget.value)}
					>
						<option value="ninguno">Sin rol comercial</option>
						<option value="cliente">Cliente</option>
						<option value="proveedor">Proveedor</option>
						<option value="ambos">Cliente y proveedor</option>
					</select>
				</FormFieldWrapper>
				{#if esDistribuidor}
					<FormFieldWrapper id="porcentaje_compensacion" label="Comisión (%)">
						<input
							class="remove-arrow input"
							min="0"
							max="100"
							step="0.01"
							{...form.fields.porcentaje_compensacion.as('number', porcentajeCompensacion)}
							bind:value={porcentajeCompensacion}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="saldo_disponible" label="Saldo disponible">
						<input
							class="remove-arrow input"
							min="0"
							step="0.01"
							{...form.fields.saldo_disponible.as('number', 0)}
						/>
					</FormFieldWrapper>
				{/if}
				{#if rol === 'proveedor' || rol === 'ambos'}
					<FormFieldWrapper id="codigo" label="Código de proveedor">
						<input class="input" {...form.fields.codigo.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_nombre" label="Contacto de compras">
						<input class="input" {...form.fields.contacto_nombre.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_email" label="Email de compras">
						<input class="input" {...form.fields.contacto_email.as('email', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_telefono" label="Teléfono de compras">
						<input class="input" {...form.fields.contacto_telefono.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="condiciones_pago" label="Condiciones de pago">
						<input class="input" {...form.fields.condiciones_pago.as('text', '')} />
					</FormFieldWrapper>
				{/if}
			</div>
		</fieldset>
		<FormDireccion {form} initialData={undefined} />
		<FormErrors {form} />
		<FormActions cancelHref="/contactos" pending={!!form.pending} submitText="Crear contacto" />
	</form>
</PageLayout>
