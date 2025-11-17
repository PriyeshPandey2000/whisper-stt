<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to global shortcuts since local shortcuts are disabled
		goto('/settings/shortcuts/global', { replaceState: true });
	});
</script>
