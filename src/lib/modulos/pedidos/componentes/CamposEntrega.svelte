<script lang="ts">
	import { FormFieldWrapper } from '$lib/ui';
	import { provincias } from '$lib/ui/direcciones';
	import {
		ENTREGA_VACIA,
		ETIQUETA_MODALIDAD,
		MODALIDADES_ENTREGA,
		retiraEnFabrica,
		type DatosEntrega
	} from '$lib/modulos/ventas/trabajo';
	import SelectTransportista from './SelectTransportista.svelte';

	type Atributos<T extends string> = { as: (tipo: T, inicial: never) => Record<string, unknown> };
	type Campo<T extends string> = Atributos<T> & {
		set: (valor: never) => void;
		value: () => unknown;
	};
	type Texto = Campo<'text'>;

	let {
		prefijo,
		campos,
		inicial = ENTREGA_VACIA,
		disabled = false
	}: {
		prefijo: string;
		campos: {
			transportista: Campo<'select'>;
			modalidad: Campo<'select'>;
			direccion: Texto;
			localidad: Texto;
			provincia: Campo<'select'>;
			codigo_postal: Texto;
			recibe: Texto;
			telefono: Texto;
			indicaciones: Texto;
			consumidor_final: Atributos<'checkbox'>;
		};
		inicial?: DatosEntrega;
		disabled?: boolean;
	} = $props();

	const texto = (campo: Texto, valor: string | null) => campo.as('text', (valor ?? '') as never);
	const seleccion = (campo: Campo<'select'>, valor: string | null) =>
		campo.as('select', (valor ?? '') as never);

	const valor = (campo: { value: () => unknown }, respaldo: string | null) =>
		String(campo.value() ?? respaldo ?? '');
	const retira = $derived(
		retiraEnFabrica({ transportista: valor(campos.transportista, inicial.transportista) })
	);
	const modalidad = $derived(valor(campos.modalidad, inicial.modalidad));
	const id = (nombre: string) => `${prefijo}-${nombre}`;
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<FormFieldWrapper id={id('transportista')} label="Transportista">
		<SelectTransportista
			id={id('transportista')}
			campo={campos.transportista as never}
			inicial={inicial.transportista ?? ''}
			{disabled}
		/>
	</FormFieldWrapper>
	{#if !retira}
		<FormFieldWrapper id={id('modalidad')} label="Entrega en">
			<select
				id={id('modalidad')}
				class="select w-full"
				{disabled}
				{...seleccion(campos.modalidad, inicial.modalidad)}
			>
				<option value="">Sin definir</option>
				{#each MODALIDADES_ENTREGA as opcion (opcion)}
					<option value={opcion}>{ETIQUETA_MODALIDAD[opcion]}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper
			id={id('direccion')}
			label={modalidad === 'domicilio' ? 'Dirección de entrega' : 'Sucursal o dirección'}
			class="sm:col-span-2"
		>
			<input
				id={id('direccion')}
				class="input w-full"
				placeholder={modalidad === 'domicilio'
					? 'Calle, número, piso'
					: 'Opcional: qué sucursal, si hay más de una en la localidad'}
				{disabled}
				{...texto(campos.direccion, inicial.direccion)}
			/>
		</FormFieldWrapper>
		<div class="grid gap-4 sm:col-span-2 sm:grid-cols-[2fr_2fr_1fr]">
			<FormFieldWrapper id={id('localidad')} label="Localidad">
				<input
					id={id('localidad')}
					class="input w-full"
					{disabled}
					{...texto(campos.localidad, inicial.localidad)}
				/>
			</FormFieldWrapper>
			<FormFieldWrapper id={id('provincia')} label="Provincia">
				<select
					id={id('provincia')}
					class="select w-full"
					{disabled}
					{...seleccion(campos.provincia, inicial.provincia)}
				>
					<option value="">Elegí la provincia</option>
					{#if inicial.provincia && !(provincias as readonly string[]).includes(inicial.provincia)}
						<option value={inicial.provincia}>{inicial.provincia}</option>
					{/if}
					{#each provincias as provincia (provincia)}
						<option value={provincia}>{provincia}</option>
					{/each}
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper id={id('codigo_postal')} label="CP">
				<input
					id={id('codigo_postal')}
					class="input w-full"
					inputmode="numeric"
					{disabled}
					{...texto(campos.codigo_postal, inicial.codigo_postal)}
				/>
			</FormFieldWrapper>
		</div>
	{/if}
	<FormFieldWrapper id={id('recibe')} label="Quién recibe">
		<input
			id={id('recibe')}
			class="input w-full"
			placeholder="Nombre y DNI"
			{disabled}
			{...texto(campos.recibe, inicial.recibe)}
		/>
	</FormFieldWrapper>
	<FormFieldWrapper id={id('telefono')} label="Teléfono de quien recibe">
		<input
			id={id('telefono')}
			class="input w-full"
			inputmode="tel"
			{disabled}
			{...texto(campos.telefono, inicial.telefono)}
		/>
	</FormFieldWrapper>
	<FormFieldWrapper
		id={id('indicaciones')}
		label="Indicaciones para el envío"
		ayuda="Lo que el que despacha tiene que saber: horarios, avisar antes, embalaje, valor a declarar."
		class="sm:col-span-2"
	>
		<textarea
			id={id('indicaciones')}
			class="textarea w-full"
			rows="2"
			{disabled}
			{...texto(campos.indicaciones, inicial.indicaciones)}></textarea>
	</FormFieldWrapper>
	<label class="label cursor-pointer items-start gap-3 text-sm whitespace-normal sm:col-span-2">
		<input
			class="checkbox checkbox-sm checkbox-primary"
			{disabled}
			{...campos.consumidor_final.as('checkbox', inicial.consumidor_final as never)}
		/>
		<span>
			<span class="font-medium text-base-content">Despachar declarado como consumidor final</span>
			<span class="block">El envío se declara a nombre de consumidor final, no de la empresa.</span>
		</span>
	</label>
</div>
