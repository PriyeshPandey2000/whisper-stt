import { APPS } from '@repo/constants/vite';
import { createAuthClient } from 'better-auth/client';
import { anonymousClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	basePath: '/auth',
	baseURL: APPS.API.URL,
	fetchOptions: {
		credentials: 'include',
	},
	plugins: [anonymousClient()],
});
