<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { rpc } from '$lib/query';
	import { queryClient } from '$lib/query/_client';
	import * as services from '$lib/services';
	import { analytics } from '$lib/services/posthog';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import '$lib/ui/app.css';
	// import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';

	import AppShell from './+layout/AppShell.svelte';
	import SignupRequiredDialog from '$lib/components/auth/SignupRequiredDialog.svelte';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Commenting out local shortcuts - keeping global shortcuts only
	// $effect(() => {
	// 	const unlisten = services.localShortcutManager.listen();
	// 	return () => unlisten();
	// });

	// Initialize PostHog and track app start
	$effect(() => {
		analytics.init();

		// Identify user for outreach purposes
		analytics.identifyUser();

		// Track app start immediately
		analytics.trackAppStart();
		rpc.analytics.logEvent.execute({ type: 'app_started' });

		// Simple first session tracking
		const lastVisit = localStorage.getItem('lastVisit');
		const now = Date.now();

		if (!lastVisit) {
			// First time opening the app (includes reinstalls: they need onboarding too!)
			analytics.trackFirstSession();
		} else {
			// Returning user: calculate days since last visit
			const daysSince = Math.floor((now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24));
			if (daysSince > 0) {
				analytics.trackUserReturned(daysSince);
			}
		}

		// Update last visit time
		localStorage.setItem('lastVisit', now.toString());
	});
</script>

<svelte:head>
	<title>NoteFlux</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
	<AppShell>
		{@render children()}
	</AppShell>
	<SignupRequiredDialog />
</QueryClientProvider>

<!-- <SvelteQueryDevtools client={queryClient} buttonPosition="bottom-left" /> -->