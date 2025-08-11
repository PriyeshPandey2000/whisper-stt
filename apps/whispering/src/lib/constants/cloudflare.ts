import { type } from 'arktype';

import { createApps, createAppUrls } from './apps.js';

/**
 * Cloudflare Workers constants and utilities
 * Takes environment at call time for dynamic resolution
 * Source of truth for lazy app constants
 */

// Schema
const cloudflareEnvSchema = type({
	BETTER_AUTH_SECRET: 'string',
	
	BETTER_AUTH_URL: 'string.url',
	DATABASE_URL: 'string.url',
	GITHUB_CLIENT_ID: 'string',
	GITHUB_CLIENT_SECRET: 'string',
	NODE_ENV: "'development' | 'production'",
});

export type CloudflareEnv = typeof cloudflareEnvSchema.infer;

export function validateCloudflareEnv(env: unknown): CloudflareEnv {
	const result = cloudflareEnvSchema(env);
	if (result instanceof type.errors) throw new Error(result.summary);
	return result;
}

/**
 * Cloudflare Workers URLs - lazy evaluation with environment.
 * 
 * For use in Cloudflare Workers and other contexts where environment is provided at call time.
 */
export const APPS = (env: CloudflareEnv) => createApps(env.NODE_ENV);

/**
 * All application URLs for Cloudflare Workers.
 * Takes environment at call time for dynamic resolution.
 * 
 * Primarily used for CORS configuration.
 */
export const APP_URLS = (env: CloudflareEnv) => createAppUrls(env.NODE_ENV);