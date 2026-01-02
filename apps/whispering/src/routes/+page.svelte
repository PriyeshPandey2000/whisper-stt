<script lang="ts">
	import type { Recording } from '$lib/services/db';
	import type { UnlistenFn } from '@tauri-apps/api/event';

	import { commandCallbacks } from '$lib/commands';
	import AuthSection from '$lib/components/auth/AuthSection.svelte';
	import SignupRequiredDialog from '$lib/components/auth/SignupRequiredDialog.svelte';
	import CopyToClipboardButton from '$lib/components/copyable/CopyToClipboardButton.svelte';
	import { ClipboardIcon } from '$lib/components/icons';
	import NavItems from '$lib/components/NavItems.svelte';
	import NoteFluxButton from '$lib/components/NoteFluxButton.svelte';
	import {
		DeviceSelector,
		TranscriptionSelector,
		TransformationSelector,
	} from '$lib/components/settings';
	import {
		recorderStateToIcons,
		RECORDING_MODE_OPTIONS,
		type RecordingMode,
		vadStateToIcons,
	} from '$lib/constants/audio';
	import { rpc } from '$lib/query';
	import { auth } from '$lib/stores/auth.svelte';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { Button } from '$lib/ui/button';
	import {
		ACCEPT_AUDIO,
		ACCEPT_VIDEO,
		FileDropZone,
		MEGABYTE,
	} from '$lib/ui/file-drop-zone';
	import * as Popover from '$lib/ui/popover';
	import * as ToggleGroup from '$lib/ui/toggle-group';
	import { createBlobUrlManager } from '$lib/utils/blobUrlManager';
	import { getRecordingTransitionId } from '$lib/utils/getRecordingTransitionId';
	import { InfoIcon, Loader2Icon } from '@lucide/svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { onDestroy, onMount } from 'svelte';

	import TranscribedTextDialog from './(config)/recordings/TranscribedTextDialog.svelte';

	let isHelpPopoverOpen = $state(false);

	const getRecorderStateQuery = createQuery(
		rpc.recorder.getRecorderState.options,
	);
	const getVadStateQuery = createQuery(rpc.vadRecorder.getVadState.options);
	const latestRecordingQuery = createQuery(
		rpc.recordings.getLatestRecording.options,
	);

	const latestRecording = $derived<Recording>(
		latestRecordingQuery.data ?? {
			title: '',
			blob: new Blob(),
			createdAt: '',
			id: '',
			subtitle: '',
			timestamp: '',
			transcribedText: '',
			transcriptionStatus: 'UNPROCESSED',
			updatedAt: '',
		},
	);

	const blobUrlManager = createBlobUrlManager();

	const blobUrl = $derived.by(() => {
		if (!latestRecording.blob) return undefined;
		return blobUrlManager.createUrl(latestRecording.blob);
	});

	const availableModes = $derived(
		RECORDING_MODE_OPTIONS.filter((mode) => {
			if (!mode.desktopOnly) return true;
			// Desktop only, only show if Tauri is available
			return window.__TAURI_INTERNALS__;
		}),
	);

	const AUDIO_EXTENSIONS = [
		'mp3',
		'wav',
		'm4a',
		'aac',
		'ogg',
		'flac',
		'wma',
		'opus',
	] as const;

	const VIDEO_EXTENSIONS = [
		'mp4',
		'avi',
		'mov',
		'wmv',
		'flv',
		'mkv',
		'webm',
		'm4v',
	] as const;

	const MIME_TYPE_MAP = {
		aac: 'audio/aac',
		avi: 'video/x-msvideo',
		flac: 'audio/flac',
		flv: 'video/x-flv',
		m4a: 'audio/mp4',
		m4v: 'video/mp4',
		mkv: 'video/x-matroska',
		mov: 'video/quicktime',
		// Audio
		mp3: 'audio/mpeg',
		// Video
		mp4: 'video/mp4',
		ogg: 'audio/ogg',
		opus: 'audio/opus',
		wav: 'audio/wav',
		webm: 'video/webm',
		wma: 'audio/x-ms-wma',
		wmv: 'video/x-ms-wmv',
	} as const;

	// Store unlisten function for drag drop events
	let unlistenDragDrop: undefined | UnlistenFn;

	// Set up desktop drag and drop listener
	onMount(async () => {
		if (!window.__TAURI_INTERNALS__) return;
		try {
			const { getCurrentWebview } = await import('@tauri-apps/api/webview');
			const { readFile } = await import('@tauri-apps/plugin-fs');
			const { basename, extname } = await import('@tauri-apps/api/path');

			const isAudio = async (path: string) =>
				AUDIO_EXTENSIONS.includes(
					(await extname(path)) as (typeof AUDIO_EXTENSIONS)[number],
				);
			const isVideo = async (path: string) =>
				VIDEO_EXTENSIONS.includes(
					(await extname(path)) as (typeof VIDEO_EXTENSIONS)[number],
				);

			const getMimeType = async (path: string) => {
				const ext = await extname(path);
				return (
					MIME_TYPE_MAP[ext as keyof typeof MIME_TYPE_MAP] ??
					'application/octet-stream'
				);
			};

			unlistenDragDrop = await getCurrentWebview().onDragDropEvent(
				async (event) => {
					if (settings.value['recording.mode'] !== 'upload') return;
					if (event.payload.type !== 'drop' || event.payload.paths.length === 0)
						return;

					// Filter for audio/video files based on extension
					const pathResults = await Promise.all(
						event.payload.paths.map(async (path) => ({
							isValid: (await isAudio(path)) || (await isVideo(path)),
							path,
						})),
					);
					const validPaths = pathResults
						.filter(({ isValid }) => isValid)
						.map(({ path }) => path);

					if (validPaths.length === 0) {
						rpc.notify.warning.execute({
							title: '⚠️ No valid files',
							description: 'Please drop audio or video files',
						});
						return;
					}

					await rpc.settings.switchRecordingMode.execute('upload');

					// Convert file paths to File objects
					const files: File[] = [];

					for (const path of validPaths) {
						try {
							const fileData = await readFile(path);
							const fileName = await basename(path);
							const mimeType = await getMimeType(path);

							const file = new File([fileData], fileName, { type: mimeType });
							files.push(file);
						} catch (error) {
							rpc.notify.error.execute({
								title: '❌ Failed to read file',
								description: `${path}: ${error}`,
							});
						}
					}

					if (files.length > 0) {
						await rpc.commands.uploadRecordings.execute({ files });
					}
				},
			);
		} catch (error) {
			rpc.notify.error.execute({
				title: '❌ Failed to set up drag drop listener',
				description: `${error}`,
			});
		}
	});

	onDestroy(() => {
		blobUrlManager.revokeCurrentUrl();
		unlistenDragDrop?.();
	});
</script>

<svelte:head>
	<title>NoteFlux</title>
</svelte:head>

<main class="flex flex-1 flex-col items-center justify-center gap-4 relative">
	<!-- Sign Out - When authenticated - Extreme top-right corner -->
	<!-- {#if auth.isAuthenticated}
		<div class="absolute top-4 right-4 z-10">
			<AuthSection />
		</div>
	{/if} -->
	
	<!-- Container wrapper for consistent max-width -->
	<div class="w-full max-w-4xl px-4 flex flex-col items-center gap-4">
		<div class="xs:flex hidden flex-col items-center gap-4">
			<h1 class="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
				NoteFlux
			</h1>
			<p class="text-muted-foreground text-center">
				Press shortcut → speak → get error-free , formatted text.
			</p>
		</div>

		<!-- Authentication Section - Show first -->
		{#if !auth.isAuthenticated}
			<div class="mb-6">
				<AuthSection />
			</div>
		{:else}
		<!-- Main App Content - Only show when authenticated -->
		<!-- Hidden toggle group - commenting out the UI but keeping the functionality -->
		<!-- <ToggleGroup.Root
			type="single"
			value={settings.value['recording.mode']}
			class="w-full"
			onValueChange={async (mode) => {
				if (!mode) return;
				await rpc.settings.switchRecordingMode.execute(mode as RecordingMode);
			}}
		>
			{#each availableModes as option}
				<ToggleGroup.Item
					value={option.value}
					aria-label={`Switch to ${option.label.toLowerCase()} mode`}
				>
					{option.icon}
					{option.label}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root> -->

		<!-- Main Content Area: Large text display with recording controls -->
		<div class="w-full flex flex-col gap-4">
			<!-- Large Text Display Area -->
			<div class="w-full">
				<TranscribedTextDialog
					recordingId={latestRecording.id}
					transcribedText={latestRecording.transcriptionStatus === 'TRANSCRIBING'
						? '...'
						: latestRecording.transcribedText}
					rows={16}
				/>
			</div>

			<!-- Recording Controls Row -->
			<div class="flex items-center justify-between gap-4">
				<!-- Left: Recording Buttons -->
				<div class="flex items-center gap-2">
					{#if settings.value['recording.mode'] === 'manual'}
						<NoteFluxButton
							tooltipContent={getRecorderStateQuery.data === 'IDLE'
								? 'Start recording'
								: 'Stop recording'}
							onclick={commandCallbacks.toggleManualRecording}
							variant="ghost"
							class="shrink-0 size-12 transform items-center justify-center duration-300 ease-in-out"
						>
							<span
								style="filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5)); view-transition-name: microphone-icon;"
								class="text-2xl leading-none"
							>
								{recorderStateToIcons[getRecorderStateQuery.data ?? 'IDLE']}
							</span>
						</NoteFluxButton>
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
						{/if}
					{:else if settings.value['recording.mode'] === 'vad'}
						<NoteFluxButton
							tooltipContent={getVadStateQuery.data === 'IDLE'
								? 'Start voice activated session'
								: 'Stop voice activated session'}
							onclick={commandCallbacks.toggleVadRecording}
							variant="ghost"
							class="shrink-0 size-12 transform items-center justify-center duration-300 ease-in-out"
						>
							<span
								style="filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5)); view-transition-name: microphone-icon;"
								class="text-2xl leading-none"
							>
								{vadStateToIcons[getVadStateQuery.data ?? 'IDLE']}
							</span>
						</NoteFluxButton>
					{/if}

					<!-- Copy Button -->
					<CopyToClipboardButton
						contentDescription="transcribed text"
						textToCopy={latestRecording.transcribedText}
						viewTransitionName={latestRecording.id && settings.value['onboarding.pasteTestCompleted'] ? getRecordingTransitionId({
							propertyName: 'transcribedText',
							recordingId: latestRecording.id,
						}) : undefined}
						size="icon"
						variant="ghost"
						disabled={latestRecording.transcriptionStatus === 'TRANSCRIBING'}
					>
						{#if latestRecording.transcriptionStatus === 'TRANSCRIBING'}
							<Loader2Icon class="size-4 animate-spin" />
						{:else}
							<ClipboardIcon class="size-4" />
						{/if}
					</CopyToClipboardButton>
				</div>

				<!-- Right: Selectors -->
				<div class="flex items-center gap-1.5">
					{#if settings.value['recording.mode'] === 'manual' && getRecorderStateQuery.data === 'IDLE'}
						<DeviceSelector />
						<TranscriptionSelector />
						<TransformationSelector />
					{:else if settings.value['recording.mode'] === 'vad' && getVadStateQuery.data === 'IDLE'}
						<DeviceSelector />
						<TranscriptionSelector />
						<TransformationSelector />
					{/if}
				</div>
			</div>
		</div>


		<NavItems class="xs:flex -mb-2.5 -mt-1 hidden" />

		<div class="xs:flex hidden flex-col items-center gap-3 mt-8">
			<!-- <p class="text-foreground/75 text-center text-sm">
				Click the microphone or press
				{' '}<NoteFluxButton
					tooltipContent="Go to local shortcut in settings"
					href="/settings/shortcuts/local"
					variant="link"
					size="inline"
				>
					<kbd
						class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-sm font-semibold"
					>
						{settings.value['shortcuts.local.toggleManualRecording']}
					</kbd>
				</NoteFluxButton>{' '}
				to start recording here.
			</p> -->
			{#if window.__TAURI_INTERNALS__}
				<div class="flex flex-col items-center gap-3">
					<div class="flex items-center gap-2">
						<NoteFluxButton
							href="/settings/shortcuts/global"
							variant="outline"
							size="sm"
							tooltipContent="Customize keyboard shortcuts"
						>
							⌨️ Change Shortcuts
						</NoteFluxButton>

						<Popover.Root bind:open={isHelpPopoverOpen}>
							<Popover.Trigger>
								<Button
									variant="ghost"
									size="icon"
									class="size-8 cursor-pointer"
									onmouseenter={() => isHelpPopoverOpen = true}
									onmouseleave={() => isHelpPopoverOpen = false}
								>
									<InfoIcon class="size-4" />
								</Button>
							</Popover.Trigger>
							<Popover.Content
								class="w-[500px]"
								onmouseenter={() => isHelpPopoverOpen = true}
								onmouseleave={() => isHelpPopoverOpen = false}
							>
								<div class="space-y-3">
									<p class="text-sm">
										Start recording with <kbd class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-xs font-semibold">{settings.value['shortcuts.global.toggleManualRecording'] || 'Not set'}</kbd>. After you finish talking, press <kbd class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-xs font-semibold">{settings.value['shortcuts.global.toggleManualRecording'] || 'Not set'}</kbd> again, then use <kbd class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-xs font-semibold">Cmd+V</kbd>.
									</p>
									<p class="text-sm">
										💡 For direct paste: place cursor first, press shortcut, speak, press shortcut again.
									</p>
									<p class="text-sm">
										To cancel: <kbd class="bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-xs font-semibold">{settings.value['shortcuts.global.cancelManualRecording'] || 'Not set'}</kbd>
									</p>
									<p class="text-sm">
										✨ <strong>Tip:</strong> For even faster results, you can disable text formatting by clicking the filter icon and unchecking transformations. This gives you raw transcripts immediately.
									</p>
								</div>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
			{/if}
		</div>
		{/if}
	</div>
</main>

<SignupRequiredDialog />
