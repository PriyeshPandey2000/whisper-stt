import type { Linter } from 'eslint';

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

/**
 * Base ESLint configuration that includes Prettier integration and ignore patterns.
 * This should be included in all configurations to ensure consistent formatting.
 */
export const base = [
	perfectionist.configs['recommended-natural'],
	{
		rules: {
			'perfectionist/sort-exports': 'off', // Only sort imports, not exports
			'perfectionist/sort-objects': [
				'error',
				{
					customGroups: [
						{
							elementNamePattern: '^children$',
							groupName: 'children',
							selector: 'property',
						},
						{
							elementNamePattern: '^title$',
							groupName: 'title',
							selector: 'property',
						},
						{
							elementNamePattern: '^description$',
							groupName: 'description',
							selector: 'property',
						},
						{
							elementNamePattern: '^cause$',
							groupName: 'cause',
							selector: 'property',
						},
						{
							elementNamePattern: '^context$',
							groupName: 'context',
							selector: 'property',
						},
						{
							elementNamePattern: '^message$',
							groupName: 'message',
							selector: 'property',
						},
					],
					groups: ['children', 'title', 'description', 'cause', 'context', 'message', 'unknown'],
					order: 'asc',
					type: 'natural',
				},
			],
		},
	},
	{
		ignores: [
			// Build outputs
			'**/dist/**',
			'**/build/**',
			'**/.svelte-kit/**',
			'**/source-target/**',
			'**/target/**',
			'**/.turbo/**',

			// Dependencies
			'**/node_modules/**',

			// Generated files
			'**/*.min.js',
			'**/*.min.css',
			'**/generated/**',

			// Test coverage
			'**/coverage/**',

			// IDE and OS files
			'**/.DS_Store',
			'**/.idea/**',
			'**/.vscode/**',

			// Temporary files
			'**/*.log',
			'**/tmp/**',
			'**/temp/**',

			// Package manager files
			'**/pnpm-lock.yaml',
			'**/package-lock.json',
			'**/yarn.lock',
		],
	},
	prettier,
] satisfies Linter.Config[];

/**
 * Complete ESLint configuration for Svelte applications.
 * Includes base config plus Svelte-specific rules and Prettier compatibility.
 */
export const svelteConfig = ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		// See more details at: https://typescript-eslint.io/packages/parser/
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
				parser: ts.parser,
				projectService: true,
			},
		},
	},
);