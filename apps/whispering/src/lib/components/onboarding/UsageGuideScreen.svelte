<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { settings } from '$lib/stores/settings.svelte';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import confetti from 'canvas-confetti';

	type Props = {
		onNext: () => void;
		onSkip: () => void;
	};

	let { onNext, onSkip }: Props = $props();

	const isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

	// Parse the shortcut into individual keys
	const shortcut = $derived(
		settings.value['shortcuts.global.toggleManualRecording'] || 'Option+Space'
	);

	const shortcutKeys = $derived(shortcut.split('+').map((key) => key.trim()));

	// Text editor state
	let editorContent = $state('');
	let hasTried = $derived(editorContent.trim().length > 0);
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let hasShownConfetti = $state(false);

	// Auto-focus textarea on mount and after dialog reopens
	onMount(async () => {
		// Focus textarea with multiple attempts to ensure it works
		const focusTextarea = () => {
			if (textareaRef) {
				textareaRef.focus();
			}
		};

		// Try multiple times with increasing delays
		setTimeout(focusTextarea, 50);
		setTimeout(focusTextarea, 150);
		setTimeout(focusTextarea, 300);

		// Ensure window stays visible and focused during paste
		const handleWindowFocus = async () => {
			if (isDesktop && window.__TAURI_INTERNALS__) {
				try {
					const { getCurrentWindow } = await import('@tauri-apps/api/window');
					const currentWindow = getCurrentWindow();
					await currentWindow.show();
					await currentWindow.unminimize();
					await currentWindow.setFocus();
					// Small delay for window to gain focus
					setTimeout(focusTextarea, 50);
				} catch (e) {
					console.log('Could not manage window state:', e);
					focusTextarea();
				}
			} else {
				focusTextarea();
			}
		};
		window.addEventListener('focus', handleWindowFocus);

		return () => {
			window.removeEventListener('focus', handleWindowFocus);
		};
	});

	// Re-focus textarea when dialog becomes visible (after navigation back from shortcuts)
	$effect(() => {
		if (onboardingStore.isOpen && onboardingStore.currentStep === 'usage-guide') {
			// Aggressive polling to ensure textarea gets focused
			let attempts = 0;
			const maxAttempts = 20;
			const interval = setInterval(() => {
				if (textareaRef && document.activeElement !== textareaRef) {
					textareaRef.focus();
					attempts++;
					if (attempts >= maxAttempts || document.activeElement === textareaRef) {
						clearInterval(interval);
					}
				} else {
					clearInterval(interval);
				}
			}, 50);

			// Cleanup after 2 seconds
			const timeout = setTimeout(() => clearInterval(interval), 2000);

			// Return cleanup function to properly clear intervals when effect is destroyed
			return () => {
				clearInterval(interval);
				clearTimeout(timeout);
			};
		}
	});

	// Show confetti when text is first added
	$effect(() => {
		if (hasTried && !hasShownConfetti) {
			hasShownConfetti = true;

			// Small delay to ensure text is visible before confetti
			setTimeout(() => {
				// Create confetti canvas with high z-index to appear above dialog
				const canvas = document.createElement('canvas');
				canvas.style.position = 'fixed';
				canvas.style.top = '0';
				canvas.style.left = '0';
				canvas.style.width = '100%';
				canvas.style.height = '100%';
				canvas.style.zIndex = '99999';
				canvas.style.pointerEvents = 'none';
				document.body.appendChild(canvas);

				const myConfetti = confetti.create(canvas, { resize: true });
				myConfetti({
					particleCount: 100,
					spread: 70,
					origin: { y: 0.6 }
				});

				// Remove canvas after animation
				setTimeout(() => {
					document.body.removeChild(canvas);
				}, 3000);
			}, 100);
		}
	});

	function handleCustomizeShortcut() {
		// Close the dialog first
		onboardingStore.close();

		// Wait for dialog cleanup before navigating
		// The Dialog component needs time to remove body styles
		setTimeout(() => {
			// Ensure body styles are reset before navigation
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
				document.body.style.pointerEvents = '';
			}
			goto('/settings/shortcuts/global?from=onboarding');
		}, 150); // Give dialog enough time to fully clean up animations and styles
	}
</script>

<!-- Styled Keyboard Key Component -->
{#snippet Kbd(key: string)}
	<span
		class="inline-flex items-center justify-center px-2 py-1 min-w-[1.75rem] text-[11px] font-medium text-white/80 bg-zinc-800 border border-zinc-700 border-b-2 border-b-zinc-600 rounded shadow-sm"
	>
		{key === 'Option' ? '\u2325' : key === 'Space' ? '\u2423' : key === 'Command' ? '\u2318' : key}
	</span>
{/snippet}

<div class="flex flex-col p-8 space-y-5">
	<!-- Header -->
	<div class="text-center space-y-2">
		<h2 class="text-xl font-semibold text-white/95">Try It Now</h2>
		<p class="text-sm text-white/50">
			{#if isDesktop}
				Press <span class="text-white/70 font-medium">{shortcut}</span> and speak to see the magic
			{:else}
				Press the shortcut and speak to see the magic
			{/if}
		</p>
	</div>

	<!-- Shortcut Display -->
	{#if isDesktop}
		<div class="flex items-center justify-center gap-1">
			{#each shortcutKeys as key, i}
				{@render Kbd(key)}
				{#if i < shortcutKeys.length - 1}
					<span class="text-white/20 text-xs mx-0.5">+</span>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Text Editor Playground -->
	<div class="relative">
		<div
			class="w-full min-h-[120px] rounded-xl border transition-all duration-300 {hasTried
				? 'border-green-500/30 bg-green-500/5'
				: 'border-white/10 bg-white/[0.02]'}"
		>
			<!-- Editor header bar -->
			<div class="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
				<div class="w-2.5 h-2.5 rounded-full bg-red-500/60"></div>
				<div class="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></div>
				<div class="w-2.5 h-2.5 rounded-full bg-green-500/60"></div>
				<span class="ml-2 text-[10px] text-white/30">Text Preview</span>
				{#if hasTried}
					<div class="ml-auto flex items-center gap-1 text-green-400">
						<CheckIcon class="w-3 h-3" />
						<span class="text-[10px] font-medium">Success!</span>
					</div>
				{/if}
			</div>

			<!-- Editor content -->
			<textarea
				bind:this={textareaRef}
				bind:value={editorContent}
				autofocus
				placeholder={isDesktop
					? 'Press your shortcut, speak, and watch the magic...'
					: 'Your transcribed text will appear here...'}
				class="w-full min-h-[80px] px-3 py-2 bg-transparent text-sm text-white/80 placeholder:text-white/30 resize-none focus:outline-none"
			></textarea>
		</div>

		<!-- Instruction overlay when empty -->
		{#if !hasTried && isDesktop}
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="text-center space-y-2 mt-6">
					<p class="text-xs text-white/40">
						Press {shortcut} and speak
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Customize Shortcut Link -->
	{#if isDesktop}
		<button
			onclick={handleCustomizeShortcut}
			class="flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors mx-auto"
		>
			<SettingsIcon class="w-3 h-3" />
			<span>Customize Shortcut</span>
		</button>
	{/if}

	<!-- Action Button -->
	<div class="pt-1">
		{#if hasTried}
			<Button onclick={onNext} class="w-full h-11 text-base font-medium cursor-pointer">
				<CheckIcon class="w-4 h-4 mr-2" />
				Start Using NoteFlux
			</Button>
		{:else}
			<div class="w-full h-11 flex items-center justify-center text-sm text-white/40">
				Try recording to continue
			</div>
		{/if}
	</div>
</div>
