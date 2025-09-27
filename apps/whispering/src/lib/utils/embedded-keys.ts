/**
 * Utility functions for accessing embedded API keys from environment variables
 * These keys are injected at build time via GitHub secrets for the SaaS model
 */

import { settings } from '$lib/stores/settings.svelte';

/**
 * Get the embedded Groq API key
 * Falls back to user settings for development/BYOK mode
 */
export function getGroqApiKey(): string {
	// Check for embedded key first (SaaS mode)
	const embeddedKey = import.meta.env.VITE_EMBEDDED_GROQ_API_KEY;
	if (embeddedKey && embeddedKey.trim() !== '') {
		return embeddedKey;
	}

	// Fallback to user settings (development/BYOK mode)
	return settings.value['apiKeys.groq'];
}

/**
 * Check if we're running in SaaS mode (embedded keys available)
 */
export function isSaaSMode(): boolean {
	const embeddedKey = import.meta.env.VITE_EMBEDDED_GROQ_API_KEY;
	return embeddedKey && embeddedKey.trim() !== '';
}