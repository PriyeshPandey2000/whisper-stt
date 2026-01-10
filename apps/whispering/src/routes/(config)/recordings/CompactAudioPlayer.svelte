<script lang="ts">
	import type { Recording } from '$lib/services/db';

	import NoteFluxButton from '$lib/components/NoteFluxButton.svelte';
	import { createBlobUrlManager } from '$lib/utils/blobUrlManager';
	import { PauseIcon, PlayIcon } from '@lucide/svelte';
	import { onDestroy } from 'svelte';

	let { blob }: Pick<Recording, 'blob'> = $props();

	const blobUrlManager = createBlobUrlManager();

	let audioEl = $state<HTMLAudioElement | null>(null);
	let isPlaying = $state(false);
	let durationSeconds = $state<number | null>(null);

	const blobUrl = $derived.by(() => {
		if (!blob) return undefined;
		return blobUrlManager.createUrl(blob);
	});

	function formatDuration(seconds: number | null) {
		if (!seconds || !Number.isFinite(seconds)) return '0:00';
		const total = Math.max(0, Math.floor(seconds));
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	onDestroy(() => {
		blobUrlManager.revokeCurrentUrl();
	});
</script>

{#if blobUrl}
	<div class="flex items-center gap-2">
		<audio
			bind:this={audioEl}
			src={blobUrl}
			preload="metadata"
			onloadedmetadata={() => {
				durationSeconds = audioEl?.duration ?? null;
			}}
			onplay={() => {
				isPlaying = true;
			}}
			onpause={() => {
				isPlaying = false;
			}}
			onended={() => {
				isPlaying = false;
			}}
			class="hidden"
		/>

		<NoteFluxButton
			variant="ghost"
			size="icon"
			class="size-7"
			tooltipContent={isPlaying ? 'Pause' : 'Play'}
			onclick={() => {
				if (!audioEl) return;
				if (isPlaying) {
					audioEl.pause();
					return;
				}
				void audioEl.play();
			}}
		>
			{#if isPlaying}
				<PauseIcon class="size-4" />
			{:else}
				<PlayIcon class="size-4" />
			{/if}
		</NoteFluxButton>

		<span class="tabular-nums text-muted-foreground">{formatDuration(durationSeconds)}</span>
	</div>
{/if}



