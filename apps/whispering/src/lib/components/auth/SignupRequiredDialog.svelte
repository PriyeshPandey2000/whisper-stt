<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { signupRequiredDialog } from '$lib/stores/signup-required-dialog.svelte';
	import { Button } from '$lib/ui/button';
	import * as Dialog from '$lib/ui/dialog';

	async function handleSignUp() {
		try {
			await auth.signUp();
		} catch (error) {
			console.error('Sign up failed:', error);
		}
	}

	async function handleSignIn() {
		try {
			await auth.signIn();
		} catch (error) {
			console.error('Sign in failed:', error);
		}
	}

	// Bring window to focus when signup modal opens
	$effect(() => {
		if (signupRequiredDialog.isOpen && window.__TAURI_INTERNALS__) {
			(async () => {
				try {
					const { getCurrentWindow } = await import('@tauri-apps/api/window');
					const currentWindow = getCurrentWindow();
					await currentWindow.setFocus();
					await currentWindow.setAlwaysOnTop(true);
					// Remove always-on-top after a brief moment
					setTimeout(async () => {
						await currentWindow.setAlwaysOnTop(false);
					}, 500);
				} catch (error) {
					console.error('Failed to bring window to focus:', error);
				}
			})();
		}
	});
</script>

<Dialog.Root bind:open={signupRequiredDialog.isOpen}>
	<Dialog.Content
		class="max-w-md z-[9999]"
		onInteractOutside={(e) => {
			// Prevent closing by clicking outside - user must sign up
			e.preventDefault();
		}}
		onEscapeKeydown={(e) => {
			// Prevent closing with escape key - user must sign up
			e.preventDefault();
		}}
		showCloseButton={false}
	>
		<Dialog.Header>
			<Dialog.Title>Sign up to continue recording</Dialog.Title>
			<Dialog.Description>
				Please sign up to keep using the app.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-2 mt-4">
			<Button onclick={handleSignUp} size="default" class="w-full">
				Sign Up
			</Button>
			<Button onclick={handleSignIn} variant="outline" size="default" class="w-full">
				Already have an account? Sign In
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
