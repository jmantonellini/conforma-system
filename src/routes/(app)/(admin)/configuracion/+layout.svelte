<script lang="ts">
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{@render children()}

<!-- SUB LAYOUT CON TABS -->