<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { onMount } from 'svelte';
	import { rpc } from '$lib/query';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MicIcon from '@lucide/svelte/icons/mic';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import LoaderIcon from '@lucide/svelte/icons/loader';

	type Props = {
		onNext: () => void;
		onSkip: () => void;
		onComplete: (complete: boolean) => void;
	};

	let { onNext, onSkip, onComplete }: Props = $props();

	type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'requesting';

	let microphoneStatus = $state<PermissionStatus>('unknown');
	let accessibilityStatus = $state<PermissionStatus>('unknown');
	let isCheckingPermissions = $state(false);

	const isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
	const totalSteps = isDesktop ? 2 : 1;

	const completedSteps = $derived(
		(microphoneStatus === 'granted' ? 1 : 0) +
			(isDesktop && accessibilityStatus === 'granted' ? 1 : 0)
	);

	const allRequiredGranted = $derived(
		microphoneStatus === 'granted' &&
			(!isDesktop || accessibilityStatus === 'granted')
	);

	async function checkPermissions() {
		isCheckingPermissions = true;

		const hasMic = await checkMicrophonePermission();
		microphoneStatus = hasMic ? 'granted' : 'denied';

		if (isDesktop) {
			const hasAccessibility = await checkAccessibilityPermission();
			accessibilityStatus = hasAccessibility ? 'granted' : 'denied';
		}

		isCheckingPermissions = false;
		onComplete(allRequiredGranted);
	}

	async function checkMicrophonePermission(): Promise<boolean> {
		try {
			if ('permissions' in navigator) {
				const permissionStatus = await navigator.permissions.query({
					name: 'microphone' as PermissionName,
				});
				return permissionStatus.state === 'granted';
			}
			return false;
		} catch {
			return false;
		}
	}

	async function checkAccessibilityPermission(): Promise<boolean> {
		if (!isDesktop) return true;

		try {
			const { invoke } = await import('@tauri-apps/api/core');
			return await invoke<boolean>('is_macos_accessibility_enabled', {
				askIfNotAllowed: false,
			});
		} catch {
			return false;
		}
	}

	async function requestMicrophonePermission() {
		microphoneStatus = 'requesting';

		try {
			let tauriWindow = null;
			if (isDesktop) {
				try {
					const { getCurrentWindow } = await import('@tauri-apps/api/window');
					tauriWindow = getCurrentWindow();
					await tauriWindow.show();
					await tauriWindow.unminimize();
					await tauriWindow.setFocus();
					await tauriWindow.setAlwaysOnTop(true);
					await tauriWindow.setFocus();
					await new Promise((resolve) => setTimeout(resolve, 500));
					await tauriWindow.setFocus();
				} catch (e) {
					console.log('Could not set window state:', e);
				}
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});

			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				microphoneStatus = 'granted';

				if (tauriWindow) {
					try {
						await tauriWindow.setAlwaysOnTop(false);
						await tauriWindow.setFocus();
					} catch (e) {
						console.log('Could not restore window:', e);
					}
				}

				rpc.notify.success.execute({
					title: 'Microphone access granted',
					description: 'You can now record audio',
				});
			}
		} catch {
			microphoneStatus = 'denied';
			rpc.notify.error.execute({
				title: 'Microphone access denied',
				description: 'Please allow microphone access in your system settings',
			});
		}

		setTimeout(checkPermissions, 500);
	}

	async function requestAccessibilityPermission() {
		if (!isDesktop) return;

		accessibilityStatus = 'requesting';

		try {
			// Disable always-on-top so user can see System Settings dialog
			let tauriWindow = null;
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window');
				tauriWindow = getCurrentWindow();
				await tauriWindow.setAlwaysOnTop(false);
			} catch (e) {
				console.log('Could not disable always on top:', e);
			}

			const { invoke } = await import('@tauri-apps/api/core');
			await invoke<boolean>('is_macos_accessibility_enabled', {
				askIfNotAllowed: true,
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const finalResult = await invoke<boolean>('is_macos_accessibility_enabled', {
				askIfNotAllowed: false,
			});

			if (finalResult) {
				accessibilityStatus = 'granted';
				rpc.notify.success.execute({
					title: 'Accessibility access granted',
					description: 'You can now use direct paste',
				});
			} else {
				accessibilityStatus = 'denied';
				rpc.notify.warning.execute({
					title: 'Accessibility permission needed',
					description: 'Enable in System Settings > Privacy > Accessibility',
				});
			}
		} catch {
			accessibilityStatus = 'denied';
		}

		setTimeout(checkPermissions, 1500);
	}

	onMount(() => {
		checkPermissions();

		const interval = setInterval(() => {
			if (!isCheckingPermissions) {
				checkPermissions();
			}
		}, 2000);

		return () => clearInterval(interval);
	});
</script>

<div class="flex flex-col p-8 space-y-6">
	<!-- Header with Progress -->
	<div class="text-center space-y-3">
		<p class="text-xs text-white/40 uppercase tracking-wider font-medium">
			Step {completedSteps + 1 > totalSteps ? totalSteps : completedSteps + 1} of {totalSteps}
		</p>
		<h2 class="text-xl font-semibold text-white/95">Grant Permissions</h2>
	</div>

	<!-- Permissions List -->
	<div class="space-y-4">
		<!-- Microphone Permission -->
		<div
			class="p-4 rounded-xl border transition-all duration-300 {microphoneStatus === 'granted'
				? 'border-green-500/30 bg-green-500/5'
				: 'border-white/10 bg-white/[0.02]'}"
		>
			<div class="flex items-start gap-3">
				<!-- Step indicator -->
				<div
					class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 {microphoneStatus === 'granted'
						? 'bg-green-500 text-white'
						: 'bg-white/10 text-white/60'}"
				>
					{#if microphoneStatus === 'granted'}
						<CheckIcon class="w-4 h-4" />
					{:else}
						<MicIcon class="w-4 h-4" />
					{/if}
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center justify-between gap-2">
						<h3 class="font-medium text-sm text-white/90">Microphone Access</h3>
						{#if microphoneStatus === 'granted'}
							<span class="text-xs font-medium text-green-400">Done</span>
						{/if}
					</div>
					<p class="text-xs text-white/50 mt-1">
						So you can speak instead of typing.
					</p>

					{#if microphoneStatus !== 'granted'}
						<div class="mt-3">
							{#if microphoneStatus === 'requesting'}
								<div class="flex items-center gap-2 text-xs text-white/50">
									<LoaderIcon class="w-3 h-3 animate-spin" />
									<span>Waiting for permission...</span>
								</div>
							{:else}
								<Button size="sm" onclick={requestMicrophonePermission} class="cursor-pointer">
									Allow Microphone
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Accessibility Permission (Desktop only) -->
		{#if isDesktop}
			<div
				class="p-4 rounded-xl border transition-all duration-300 {accessibilityStatus === 'granted'
					? 'border-green-500/30 bg-green-500/5'
					: 'border-white/10 bg-white/[0.02]'}"
			>
				<div class="flex items-start gap-3">
					<!-- Step indicator -->
					<div
						class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 {accessibilityStatus === 'granted'
							? 'bg-green-500 text-white'
							: 'bg-white/10 text-white/60'}"
					>
						{#if accessibilityStatus === 'granted'}
							<CheckIcon class="w-4 h-4" />
						{:else}
							<ShieldIcon class="w-4 h-4" />
						{/if}
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between gap-2">
							<h3 class="font-medium text-sm text-white/90">Accessibility Access</h3>
							{#if accessibilityStatus === 'granted'}
								<span class="text-xs font-medium text-green-400">Done</span>
							{/if}
						</div>
						<p class="text-xs text-white/50 mt-1">
							So NoteFlux can paste your text anywhere instantly.
						</p>

						{#if accessibilityStatus !== 'granted'}
							<div class="mt-3">
								{#if accessibilityStatus === 'requesting'}
									<div class="flex items-center gap-2 text-xs text-white/50">
										<LoaderIcon class="w-3 h-3 animate-spin" />
										<span>Opening System Settings...</span>
									</div>
								{:else}
									<Button size="sm" variant="outline" onclick={requestAccessibilityPermission} class="cursor-pointer">
										Open Settings
									</Button>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Status Message -->
	{#if allRequiredGranted}
		<div class="text-center py-2">
			<p class="text-sm text-green-400 font-medium">
				All set! Continuing...
			</p>
		</div>
	{/if}
</div>
