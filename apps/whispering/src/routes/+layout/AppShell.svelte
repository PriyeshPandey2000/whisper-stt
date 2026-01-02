<script lang="ts">
	import { goto } from '$app/navigation';
	import { commandCallbacks } from '$lib/commands';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import MoreDetailsDialog from '$lib/components/MoreDetailsDialog.svelte';
	// import NotificationLog from '$lib/components/NotificationLog.svelte';
	import UpdateDialog from '$lib/components/UpdateDialog.svelte';
	import UsageLimitDialog from '$lib/components/UsageLimitDialog.svelte';
	import { usageLimitDialog } from '$lib/stores/usage-limit-dialog.svelte';
	import AuthRequiredDialog from '$lib/components/AuthRequiredDialog.svelte';
	import { authRequiredDialog } from '$lib/stores/auth-required-dialog.svelte';
	import OnboardingFlow from '$lib/components/onboarding/OnboardingFlow.svelte';
	import { rpc } from '$lib/query';
	import * as services from '$lib/services';
	import { settings } from '$lib/stores/settings.svelte';
	// import { extension } from '@repo/extension';
	import { createQuery } from '@tanstack/svelte-query';
	import { mode, ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { Toaster, type ToasterProps } from 'svelte-sonner';

	import { syncWindowAlwaysOnTopWithRecorderState } from './alwaysOnTop.svelte';
	import { checkForUpdates } from './check-for-updates';
	import {
		resetGlobalShortcutsToDefaultIfDuplicates,
		resetLocalShortcutsToDefaultIfDuplicates,
		syncGlobalShortcutsWithSettings,
		syncLocalShortcutsWithSettings,
	} from './register-commands';
	import { registerOnboarding } from './register-onboarding';

	const getRecorderStateQuery = createQuery(
		rpc.recorder.getRecorderState.options,
	);
	const getVadStateQuery = createQuery(rpc.vadRecorder.getVadState.options);

	onMount(async () => {
		window.commands = commandCallbacks;
		window.goto = goto;
		// Commenting out local shortcuts - using global shortcuts only
		// syncLocalShortcutsWithSettings();
		// resetLocalShortcutsToDefaultIfDuplicates();
		if (window.__TAURI_INTERNALS__) {
			syncGlobalShortcutsWithSettings();
			resetGlobalShortcutsToDefaultIfDuplicates();
			await checkForUpdates();
			// Start global permission monitoring for Fn key functionality
			await services.permissionMonitor.start();
		} else {
			// const _notifyNoteFluxTabReadyResult =
			// await extension.notifyNoteFluxTabReady(undefined);
		}
		registerOnboarding();
	});

	if (window.__TAURI_INTERNALS__) {
		syncWindowAlwaysOnTopWithRecorderState();
	}

	$effect(() => {
		getRecorderStateQuery.data;
		getVadStateQuery.data;
		services.db.cleanupExpiredRecordings({
			maxRecordingCount: settings.value['database.maxRecordingCount'],
			recordingRetentionStrategy:
				settings.value['database.recordingRetentionStrategy'],
		});
	});

	const TOASTER_SETTINGS = {
		closeButton: true,
		duration: 5000,
		position: 'bottom-right',
		richColors: true,
		toastOptions: {
			classes: {
				actionButton: 'w-full mt-3 inline-flex justify-center',
				closeButton: 'w-full mt-3 inline-flex justify-center',
				icon: 'shrink-0',
				toast: 'flex flex-wrap *:data-content:flex-1',
			},
		},
		visibleToasts: 5,
	} satisfies ToasterProps;

	let { children } = $props();
</script>

<button
	class="xxs:hidden hover:bg-accent hover:text-accent-foreground h-screen w-screen transform duration-300 ease-in-out"
	onclick={commandCallbacks.toggleManualRecording}
>
	<span
		style="filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5));"
		class="text-[48px] leading-none"
	>
		{#if getRecorderStateQuery.data === 'RECORDING'}
			⏹️
		{:else}
			🎙️
		{/if}
	</span>
</button>

<div class="xxs:flex hidden flex-col items-center gap-2">
	{@render children()}
</div>

<Toaster
	offset={16}
	class="xs:block hidden"
	theme={mode.current}
	{...TOASTER_SETTINGS}
/>
<ModeWatcher />
<ConfirmationDialog />
<MoreDetailsDialog />
<!-- <NotificationLog /> -->
<UpdateDialog />
<UsageLimitDialog 
	bind:open={usageLimitDialog.isOpen}
	totalMinutes={usageLimitDialog.totalMinutes}
	limitMinutes={usageLimitDialog.limitMinutes}
/>
<AuthRequiredDialog bind:open={authRequiredDialog.isOpen} />
<OnboardingFlow />

<style>
   :global(body) {
      min-height: 100vh;
      display: grid;
      grid-template-rows: 1fr auto;
   }
</style>
