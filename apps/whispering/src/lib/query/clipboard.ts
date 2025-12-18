import * as services from '$lib/services';

import { defineMutation } from './_client';

export const clipboard = {
	copyToClipboard: defineMutation({
		mutationKey: ['clipboard', 'copyToClipboard'],
		resultMutationFn: ({ text }: { text: string }) =>
			services.clipboard.copyToClipboard(text),
	}),
	typeAtCursor: defineMutation({
		mutationKey: ['clipboard', 'typeAtCursor'],
		resultMutationFn: ({ text, keepWindowVisible, refocusWindow }: { text: string; keepWindowVisible?: boolean; refocusWindow?: boolean }) =>
			services.clipboard.typeAtCursor(text, keepWindowVisible, refocusWindow),
	}),
	pasteFromClipboard: defineMutation({
		mutationKey: ['clipboard', 'pasteFromClipboard'],
		resultMutationFn: async () => await services.clipboard.pasteFromClipboard(),
	}),
};
