<script lang="ts">
	import { Button } from '$lib/ui/button';
	import * as Dialog from '$lib/ui/dialog';
	import { auth } from '$lib/stores/auth.svelte';

	let { 
		open = $bindable(false)
	}: { 
		open?: boolean;
	} = $props();

	async function handleSignIn() {
		try {
			await auth.signIn();
			open = false;
		} catch (error) {
			console.error('Sign in failed:', error);
		}
	}

	async function handleSignUp() {
		try {
			await auth.signUp();
			open = false;
		} catch (error) {
			console.error('Sign up failed:', error);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<span class="text-2xl">🔐</span>
				Authentication Required
			</Dialog.Title>
			<Dialog.Description>
				Please sign in to use NoteFlux recording and transcription features.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button variant="outline" onclick={handleSignUp}>
				Sign Up
			</Button>
			<Button onclick={handleSignIn}>
				Sign In
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

