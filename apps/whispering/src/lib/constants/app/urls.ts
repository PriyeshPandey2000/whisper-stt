import { APPS } from '$lib/constants/vite';

/**
 * URL and pathname constants for the NoteFlux application
 */
export const WHISPERING_URL = APPS.AUDIO.URL;

export const WHISPERING_URL_WILDCARD = `${WHISPERING_URL}/*` as const;

export const WHISPERING_RECORDINGS_PATHNAME = '/recordings' as const;

export const WHISPERING_SETTINGS_PATHNAME = '/settings' as const;
