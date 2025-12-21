<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { rpc } from '$lib/query';
	import { settings } from '$lib/stores/settings.svelte';
	import { onboardingStore } from '$lib/stores/onboarding.svelte';
	import { analytics } from '$lib/services/posthog';
	import { Button } from '$lib/ui/button';
	import * as Dialog from '$lib/ui/dialog';
	import { tryAsync } from 'wellcrafted/result';
	import { onMount, onDestroy } from 'svelte';
	import WelcomeScreen from './WelcomeScreen.svelte';
	import PermissionsScreen from './PermissionsScreen.svelte';
	import UsageGuideScreen from './UsageGuideScreen.svelte';

	type OnboardingStep = 'welcome' | 'permissions' | 'usage-guide' | 'complete';

	let permissionsComplete = $state(false);
	let hasProcessedReopen = $state(false);

	function nextStep() {
		switch (onboardingStore.currentStep) {
			case 'welcome':
				analytics.trackOnboardingStepCompleted('welcome');
				onboardingStore.currentStep = 'permissions';
				break;
			case 'permissions':
				if (permissionsComplete) {
					analytics.trackOnboardingStepCompleted('permissions');
					onboardingStore.currentStep = 'usage-guide';
				}
				break;
			case 'usage-guide':
				analytics.trackOnboardingStepCompleted('usage-guide');
				onboardingStore.currentStep = 'complete';
				completeOnboarding();
				break;
		}
	}

	function skipOnboarding() {
		analytics.trackOnboardingSkipped(onboardingStore.currentStep);
		completeOnboarding();
	}

	function completeOnboarding() {
		// Mark onboarding as complete
		settings.updateKey('app.onboardingCompleted', true);
		onboardingStore.close();
		onboardingStore.currentStep = 'welcome'; // Reset for next time

		// Reset body styles that may have been set by dialog
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
			document.body.style.pointerEvents = '';
		}

		// Track completion
		analytics.trackOnboardingCompleted();
		rpc.analytics.logEvent.execute({
			type: 'onboarding_completed'
		});
	}

	function handlePermissionsComplete(complete: boolean) {
		permissionsComplete = complete;
		if (complete) {
			// Auto-advance after a short delay to show success state
			setTimeout(() => {
				nextStep();
			}, 1000);
		}
	}

	// Check if onboarding should be shown
	onMount(async () => {
		const isCompleted = settings.value['app.onboardingCompleted'];
		console.log('Onboarding completed:', isCompleted); // Debug log

		// Force onboarding for development/fresh builds (uncomment for testing)
		// settings.updateKey('app.onboardingCompleted', false);

		if (!isCompleted) {
			onboardingStore.isOpen = true;
			// Track onboarding started with user email
			analytics.trackOnboardingStarted();
		}
	});

	// Force hide recording overlay when component is destroyed
	onDestroy(async () => {
		// Reset body styles that may have been set by dialog
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
			document.body.style.pointerEvents = '';
		}

		if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
			try {
				const { invoke } = await import('@tauri-apps/api/core');
				await invoke('hide_recording_overlay');
			} catch (error) {
				// Silently fail if overlay is not visible
			}
		}
	});

	// Reset body styles when dialog closes
	$effect(() => {
		if (!onboardingStore.isOpen && typeof document !== 'undefined') {
			// Dialog is closed, ensure body styles are reset
			document.body.style.overflow = '';
			document.body.style.pointerEvents = '';
		}
	});

	// Check for query param to reopen onboarding after shortcut configuration
	$effect(() => {
		const reopenStep = $page.url.searchParams.get('reopenOnboarding') as OnboardingStep | null;

		if (reopenStep && !hasProcessedReopen) {
			hasProcessedReopen = true;

			// Reset paste test when returning to usage guide after shortcut customization
			if (reopenStep === 'usage-guide') {
				settings.updateKey('onboarding.pasteTestCompleted', false);
			}

			// Clean up the URL
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('reopenOnboarding');
			window.history.replaceState({}, '', newUrl.pathname + newUrl.search);

			// Open the dialog
			onboardingStore.openAt(reopenStep);
		}

		// Reset the flag when there's no query param (so it can process again next time)
		if (!reopenStep && hasProcessedReopen) {
			hasProcessedReopen = false;
		}
	});

	// Debug functions - expose to window for manual testing
	if (typeof window !== 'undefined') {
		(window as any).showOnboarding = (step?: OnboardingStep) => {
			onboardingStore.currentStep = step || 'welcome';
			permissionsComplete = false; // Reset to prevent auto-advance
			onboardingStore.isOpen = true;
		};

		(window as any).resetOnboarding = () => {
			settings.updateKey('app.onboardingCompleted', false);
			settings.updateKey('onboarding.pasteTestCompleted', false);
			onboardingStore.currentStep = 'welcome';
			permissionsComplete = false;
			console.log('✅ Onboarding reset! Refresh the page to see the automatic onboarding flow.');
		};
	}
</script>

<Dialog.Root bind:open={onboardingStore.isOpen}>
	<Dialog.Content
		class="max-w-md border border-white/10 bg-zinc-900/80 backdrop-blur-2xl shadow-[0px_40px_80px_rgba(0,0,0,0.6)] rounded-2xl !z-[9999]"
		showCloseButton={false}
		overlayClass="bg-black/40 backdrop-blur-xl !z-[9998]"
		onInteractOutside={(e) => {
			// Prevent closing during permissions and usage-guide steps
			if (onboardingStore.currentStep !== 'welcome') {
				e.preventDefault();
			}
		}}
		onEscapeKeydown={(e) => {
			// Prevent closing during permissions and usage-guide steps
			if (onboardingStore.currentStep !== 'welcome') {
				e.preventDefault();
			}
		}}
	>
		<div class="relative overflow-hidden">
			{#if onboardingStore.currentStep === 'welcome'}
				<WelcomeScreen onNext={nextStep} onSkip={skipOnboarding} />
			{:else if onboardingStore.currentStep === 'permissions'}
				<PermissionsScreen
					onNext={nextStep}
					onSkip={skipOnboarding}
					onComplete={handlePermissionsComplete}
				/>
			{:else if onboardingStore.currentStep === 'usage-guide'}
				<UsageGuideScreen onNext={nextStep} onSkip={skipOnboarding} />
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>