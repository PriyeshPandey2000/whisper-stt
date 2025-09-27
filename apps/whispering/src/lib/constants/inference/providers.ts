/**
 * AI inference provider configurations
 */

export const INFERENCE_PROVIDERS = [
	// COMMENTED OUT: BYOK providers - using only Groq for SaaS model
	// 'OpenAI',
	'Groq',
	// 'Anthropic',
	// 'Google',
] as const;

export const INFERENCE_PROVIDER_OPTIONS = INFERENCE_PROVIDERS.map(
	(provider) => ({
		label: provider,
		value: provider,
	}),
);
