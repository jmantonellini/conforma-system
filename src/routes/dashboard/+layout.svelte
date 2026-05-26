<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

{#if data.session}
	<div class="flex justify-between border-b bg-gray-100 p-4">
		<!-- <span>Bienvenido, {data.session?.username} ({data.session.rol})</span> -->
		<button
			onclick={async () => {
				await fetch('/api/logout', { method: 'POST' });
				goto(resolve('/login'));
			}}
		>
			Cerrar sesión
		</button>
	</div>
	{@render children()}
{/if}
