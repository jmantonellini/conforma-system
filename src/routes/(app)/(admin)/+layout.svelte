<script lang="ts">
	import { Can } from '$lib/ui';
	import { Modulos } from '$lib/tipos';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<Can modulo={Modulos.CONFIGURACION}>
	{@render children()}
</Can>
