import type { TRANSCRIPTION_SERVICE_IDS } from '$lib/constants/transcription';
import { invoke } from '@tauri-apps/api/core';

// Use the TranscriptionServiceId type directly
type TranscriptionServiceId = (typeof TRANSCRIPTION_SERVICE_IDS)[number];

// Settings sections that can be logged
type SettingsSection =
	| 'transcription'
	| 'shortcuts'
	| 'audio'
	| 'appearance'
	| 'analytics'
	| 'recording';

/**
 * Discriminated union of all loggable events.
 * Each event has a 'type' field and optional additional properties.
 * No personal data or user-generated content is ever collected.
 */
export type Event =
	// Application lifecycle
	| { type: 'app_started' }
	// Recording completion events - always include blob_size, duration when available
	| { type: 'manual_recording_completed'; blob_size: number; duration?: number }
	| { type: 'vad_recording_completed'; blob_size: number; duration?: number }
	| { type: 'file_uploaded'; blob_size: number }
	// Transcription events
	| { type: 'transcription_requested'; provider: TranscriptionServiceId }
	| {
			type: 'transcription_completed';
			provider: TranscriptionServiceId;
			duration: number;
	  }
	| {
			type: 'transcription_failed';
			provider: TranscriptionServiceId;
			error_title: string;
			error_description?: string;
	  }
	// Settings events
	| { type: 'settings_changed'; section: SettingsSection };

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
		[key: string]: string | number;
	},
): Promise<void> {
	await invoke<string>('plugin:aptabase|track_event', { name, props });
}
