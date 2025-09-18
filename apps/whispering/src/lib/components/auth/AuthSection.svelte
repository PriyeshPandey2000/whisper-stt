<script lang="ts">
	import { Button } from '$lib/ui/button';
	import { auth } from '$lib/stores/auth.svelte';
	
	// AuthSection component loaded
	
	async function handleSignIn() {
		try {
			console.log('🎯 Sign In button clicked!');
			console.log('🔍 auth object:', auth);
			console.log('🔍 auth.signIn function:', auth.signIn);
			await auth.signIn();
			console.log('✅ Sign In completed');
		} catch (error) {
			console.error('💥 Sign in failed:', error);
		}
	}
	
	async function handleSignUp() {
		try {
			console.log('🎯 Sign Up button clicked!');
			console.log('🔍 auth object:', auth);
			console.log('🔍 auth.signUp function:', auth.signUp);
			await auth.signUp();
			console.log('✅ Sign Up completed');
		} catch (error) {
			console.error('💥 Sign up failed:', error);
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

<div class="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/20">
	{#if auth.isLoading}
		<div class="text-center">
			<p class="text-sm text-muted-foreground mb-2">Loading authentication...</p>
			<Button disabled size="sm">
				Loading...
			</Button>
		</div>
	{:else if auth.isAuthenticated}
		<div class="text-center">
			<p class="text-sm text-muted-foreground mb-2">
				Welcome, {auth.user?.email}!
			</p>
			<Button onclick={handleSignOut} size="sm" variant="outline">
				Sign Out
			</Button>
		</div>
	{:else}
		<div class="text-center">
			<p class="text-sm text-muted-foreground mb-3">
				Sign in to sync your recordings and settings
			</p>
			<div class="flex gap-2">
				<Button onclick={handleSignIn} size="sm" variant="default">
					Sign In
				</Button>
				<Button onclick={handleSignUp} size="sm" variant="outline">
					Sign Up
				</Button>
			</div>
		</div>
	{/if}
</div>