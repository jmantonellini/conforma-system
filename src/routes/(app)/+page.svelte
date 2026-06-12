<script lang="ts">
	import type { PageProps } from './$types';
	import { PageHeader, PageLayout } from '$lib/components/ui';

	let { data }: PageProps = $props();
</script>

<PageLayout>
	<PageHeader title="Usuarios" description="Gestiona los usuarios de la empresa" />

	<table class="w-full border-collapse">
		<thead>
			<tr class="bg-gray-200">
				<th class="border p-2">Usuario</th>
				<th class="border p-2">Rol</th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as user (user.id)}
				<tr>
					<td class="border p-2">{user.username}</td>
					<td class="border p-2">{user.rol_id}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</PageLayout>
