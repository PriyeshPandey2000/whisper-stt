<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { auth } from '$lib/stores/auth.svelte';
	
	async function handleSignIn() {
		try {
			await auth.signIn();
		} catch (error) {
			console.error('Sign in failed:', error);
		}
	}
	
	async function handleSignOut() {
		try {
			await auth.signOut();
		} catch (error) {
			console.error('Sign out failed:', error);
		}
	}
</script>

{#if auth.isLoading}
	<Button disabled size="sm">
		Loading...
	</Button>
{:else if auth.isAuthenticated}
	<div class="flex items-center gap-2">
		<span class="text-sm text-muted-foreground">
			{auth.user?.email}
		</span>
		<Button on:click={handleSignOut} size="sm" variant="outline">
			Sign Out
		</Button>
	</div>
{:else}
	<Button on:click={handleSignIn} size="sm">
		Sign In
	</Button>
{/if}