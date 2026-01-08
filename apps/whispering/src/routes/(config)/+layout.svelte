<script lang="ts">
	import { commandCallbacks } from '$lib/commands';
	import NoteFluxButton from '$lib/components/NoteFluxButton.svelte';
	import {
		DeviceSelector,
		TranscriptionSelector,
		TransformationSelector,
	} from '$lib/components/settings';
	import {
		recorderStateToIcons,
		vadStateToIcons,
	} from '$lib/constants/audio';
	import { rpc } from '$lib/query';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/ui/utils';
	import { createQuery } from '@tanstack/svelte-query';

	const getRecorderStateQuery = createQuery(
		rpc.recorder.getRecorderState.options,
	);
	const getVadStateQuery = createQuery(rpc.vadRecorder.getVadState.options);

	let { children } = $props();
</script>

<header
	class={cn(
		'border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b shadow-xs backdrop-blur-sm ',
		'flex h-14 w-full items-center px-4 sm:px-8 gap-1.5',
	)}
	style="view-transition-name: header"
>
	<div class="mr-auto flex gap-2 md:hidden">
		<NoteFluxButton
			tooltipContent="Go home"
			href="/"
			variant="ghost"
			class="-ml-4"
		>
			<span class="text-lg font-bold">noteflux</span>
		</NoteFluxButton>
	</div>
	{#if settings.value['recording.mode'] === 'manual'}
		{#if getRecorderStateQuery.data === 'RECORDING'}
			<NoteFluxButton
				tooltipContent="Cancel recording"
				onclick={commandCallbacks.cancelManualRecording}
				variant="ghost"
				size="icon"
				style="view-transition-name: cancel-icon;"
			>
				🚫
			</NoteFluxButton>
		{:else}
			<DeviceSelector />
			<TranscriptionSelector />
			<TransformationSelector />
		{/if}
		<NoteFluxButton
			tooltipContent={getRecorderStateQuery.data === 'RECORDING'
				? 'Stop recording'
				: 'Start recording'}
			onclick={commandCallbacks.toggleManualRecording}
			variant="ghost"
			size="icon"
			style="view-transition-name: microphone-icon"
		>
			{recorderStateToIcons[getRecorderStateQuery.data ?? 'IDLE']}
		</NoteFluxButton>
	{:else if settings.value['recording.mode'] === 'vad'}
		{#if getVadStateQuery.data === 'IDLE'}
			<DeviceSelector />
			<TranscriptionSelector />
			<TransformationSelector />
		{/if}
		<NoteFluxButton
			tooltipContent="Toggle voice activated recording"
			onclick={commandCallbacks.toggleVadRecording}
			variant="ghost"
			size="icon"
			style="view-transition-name: microphone-icon"
		>
			{vadStateToIcons[getVadStateQuery.data ?? 'IDLE']}
		</NoteFluxButton>
	{:else if settings.value['recording.mode'] === 'live'}
		{#if true}
			<DeviceSelector />
			<TranscriptionSelector />
			<TransformationSelector />
		{/if}
		<NoteFluxButton
			tooltipContent="Toggle live recording"
			onclick={() => {
				// TODO: Implement live recording toggle
				alert('Live recording not yet implemented');
			}}
			variant="ghost"
			size="icon"
			style="view-transition-name: microphone-icon"
		>
			🎬
		</NoteFluxButton>
	{/if}

</header>

{@render children()}
