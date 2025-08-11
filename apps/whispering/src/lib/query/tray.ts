import type { NoteFluxRecordingState } from '$lib/constants/audio';

import { fromTaggedErr, type NoteFluxError } from '$lib/result';
import * as services from '$lib/services';
import { Ok, type Result } from 'wellcrafted/result';

import { defineMutation } from './_client';

const setTrayIconKeys = {
	setTrayIcon: ['setTrayIcon', 'setTrayIcon'] as const,
};

export const tray = {
	setTrayIcon: defineMutation({
		mutationKey: setTrayIconKeys.setTrayIcon,
		resultMutationFn: async ({
			icon,
		}: {
			icon: NoteFluxRecordingState;
		}): Promise<Result<void, NoteFluxError>> => {
			const { data, error } = await services.tray.setTrayIcon(icon);

			if (error) {
				return fromTaggedErr(error, {
					title: '⚠️ Failed to set tray icon',
					action: { error, type: 'more-details' },
				});
			}

			return Ok(data);
		},
	}),
};
