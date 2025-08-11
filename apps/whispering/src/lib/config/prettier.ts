import type { Config } from 'prettier';

import svelte from 'prettier-plugin-svelte';

/**
 * Shared Prettier configuration for Svelte applications in the NoteFlux monorepo.
 *
 * This config complements the root-level Biome formatting by providing
 * Svelte-specific formatting rules that Biome doesn't support.
 *
 * @remarks
 * While Biome handles general TypeScript/JavaScript formatting at the root level,
 * Svelte components require specialized formatting through the prettier-plugin-svelte.
 */
export const prettierConfig = {
	overrides: [
		{
			files: '*.svelte',
			options: {
				parser: 'svelte',
			},
		},
	],
	plugins: [svelte],
	printWidth: 80,
	singleQuote: true,
	trailingComma: 'all',
	useTabs: true,
} satisfies Config;