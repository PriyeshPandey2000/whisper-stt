import type { AppRouter } from '@epicenter/api';

import { APPS } from '@repo/constants/vite';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: 'include',
				});
			},
			url: `${APPS.API.URL}/trpc`,
		}),
	],
});
