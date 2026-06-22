<script lang="ts">
	import type { PageProps } from './$types';
	import { PageHeader, PageLayout } from '$lib/components/ui';

	let { data }: PageProps = $props();
</script>

<PageLayout>
	<PageHeader title="Usuarios" description="Gestiona los usuarios de la empresa" />
</PageLayout>
