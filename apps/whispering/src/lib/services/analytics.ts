import type { TRANSCRIPTION_SERVICE_IDS } from '$lib/constants/transcription';

import { invoke } from '@tauri-apps/api/core';

/**
 * Discriminated union of all loggable events.
 * Each event has a 'type' field and optional additional properties.
 * No personal data or user-generated content is ever collected.
 */
export type Event =
	// Application lifecycle
	| { blob_size: number; duration?: number; type: 'manual_recording_completed'; }
	// Recording completion events - always include blob_size, duration when available
	| { blob_size: number; duration?: number; type: 'vad_recording_completed'; }
	| { blob_size: number; type: 'file_uploaded'; }
	| {
			duration: number;
			provider: TranscriptionServiceId;
			type: 'transcription_completed';
	  }
	// Transcription events
	| {
			error_description?: string;
			error_title: string;
			provider: TranscriptionServiceId;
			type: 'transcription_failed';
	  }
	| { provider: TranscriptionServiceId; type: 'transcription_requested'; }
	| { section: SettingsSection; type: 'settings_changed'; }
	// Settings events
	| { type: 'app_started' };

// Settings sections that can be logged
type SettingsSection =
	| 'analytics'
	| 'appearance'
	| 'audio'
	| 'recording'
	| 'shortcuts'
	| 'transcription';

// Use the TranscriptionServiceId type directly
type TranscriptionServiceId = (typeof TRANSCRIPTION_SERVICE_IDS)[number];

/**
 * Stateless analytics service that provides utilities for event logging.
 * This is a thin wrapper around Aptabase with no business logic.
 */
export const analytics = {
	/**
	 * Send an event to Aptabase
	 */
	async logEvent(event: Event): Promise<void> {
		try {
			const { type, ...properties } = event;
			await aptabaseLogEvent(type, properties);
		} catch (error) {
			// Silently fail - analytics should never break the app
			console.debug('[Analytics] Event logging failed:', error);
		}
	},
};

export async function aptabaseLogEvent(
	name: string,
	props?: {
		[key: string]: number | string;
	},
): Promise<void> {
	await invoke<string>('plugin:aptabase|track_event', { name, props });
}
