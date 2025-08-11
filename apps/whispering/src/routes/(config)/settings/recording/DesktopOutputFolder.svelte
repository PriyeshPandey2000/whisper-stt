<script lang="ts">
	import { Input } from '$lib/ui/input';
	import WhisperingButton from '$lib/components/WhisperingButton.svelte';
	import { FolderOpen, ExternalLink, RotateCcw } from '@lucide/svelte';
	import { settings } from '$lib/stores/settings.svelte';

	// Top-level await to get the default app data directory
	let defaultAppDataPath = $state<string | null>(null);
	
	// Initialize the default path asynchronously
	if (window.__TAURI_INTERNALS__) {
		import('@tauri-apps/api/path').then(async ({ appDataDir }) => {
			defaultAppDataPath = await appDataDir();
		});
	}

	// Derived state for the display path
	const displayPath = $derived(
		settings.value['recording.desktop.outputFolder'] ?? defaultAppDataPath ?? null
	);

	async function selectOutputFolder() {
		if (!window.__TAURI_INTERNALS__) return;
		
		const { open } = await import('@tauri-apps/plugin-dialog');
		const selected = await open({
			directory: true,
			multiple: false,
			title: 'Select Recording Output Folder',
		});
		
		if (selected) settings.updateKey('recording.desktop.outputFolder', selected);
	}

	async function openOutputFolder() {
		if (!window.__TAURI_INTERNALS__) return;
		const { openPath } = await import('@tauri-apps/plugin-opener');
		
		const folderPath = settings.value['recording.desktop.outputFolder'] ?? defaultAppDataPath;
		if (folderPath) {
			await openPath(folderPath);
		}
	}
</script>

<div class="flex items-center gap-2">
	{#if displayPath === null}
		<Input 
			type="text" 
			placeholder="Loading..." 
			disabled 
			class="flex-1"
		/>
	{:else}
		<Input 
			type="text" 
			value={displayPath}
			readonly
			class="flex-1"
		/>
	{/if}
	
	<WhisperingButton 
		tooltipContent="Select output folder"
		variant="outline" 
		size="icon"
		onclick={selectOutputFolder}
	>
		<FolderOpen class="h-4 w-4" />
	</WhisperingButton>
	
	<WhisperingButton 
		tooltipContent="Open output folder"
		variant="outline" 
		size="icon"
		onclick={openOutputFolder}
		disabled={displayPath === null}
	>
		<ExternalLink class="h-4 w-4" />
	</WhisperingButton>
	
	{#if settings.value['recording.desktop.outputFolder']}
		<WhisperingButton
			tooltipContent="Reset to default folder"
			variant="outline"
			size="icon"
			onclick={() => {
				settings.updateKey('recording.desktop.outputFolder', null);
			}}
		>
			<RotateCcw class="h-4 w-4" />
		</WhisperingButton>
	{/if}
</div>