import type { NoteFluxSoundNames } from '$lib/constants/sounds';
import type { Result } from 'wellcrafted/result';

import { createTaggedError } from 'wellcrafted/error';

export const { PlaySoundServiceErr, PlaySoundServiceError } = createTaggedError(
	'PlaySoundServiceError',
);
export type PlaySoundService = {
	playSound: (
		soundName: NoteFluxSoundNames,
	) => Promise<Result<void, PlaySoundServiceError>>;
};

export type PlaySoundServiceError = ReturnType<typeof PlaySoundServiceError>;
