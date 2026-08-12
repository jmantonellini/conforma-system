<script lang="ts">
	import { Can } from '$lib/components/ui';
	import { Modulos } from '$lib/types';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<Can modulo={Modulos.CONFIGURACION}>
	{@render children()}
</Can>
