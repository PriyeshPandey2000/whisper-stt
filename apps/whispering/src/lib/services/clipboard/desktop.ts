import { NoteFluxWarningErr } from '$lib/result';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { type } from '@tauri-apps/plugin-os';
import { Err, Ok, tryAsync } from 'wellcrafted/result';

import type { ClipboardService } from '.';

import { ClipboardServiceErr } from './types';

export function createClipboardServiceDesktop(): ClipboardService {
	return {
		copyToClipboard: (text) =>
			tryAsync({
				mapErr: (error) =>
					ClipboardServiceErr({
						cause: error,
						context: { text },
						message:
							'There was an error copying to the clipboard using the Tauri Clipboard Manager API. Please try again.',
					}),
				try: () => writeText(text),
			}),

		pasteFromClipboard: async () => {
			// Try to paste using keyboard shortcut
			const { error: pasteError } = await tryAsync({
				mapErr: (error) =>
					ClipboardServiceErr({
						cause: error,
						message:
							'There was an error simulating the paste keyboard shortcut. Please try pasting manually with Cmd/Ctrl+V.',
					}),
				try: () => invoke<void>('paste'),
			});

			// If paste succeeded, we're done
			if (!pasteError) return Ok(undefined);

			// On macOS, check accessibility permissions when paste fails
			const isMacos = type() === 'macos';
			if (!isMacos) return Err(pasteError);

			// On macOS, check accessibility permissions
			const {
				data: isAccessibilityEnabled,
				error: isAccessibilityEnabledError,
			} = await tryAsync({
				mapErr: (error) =>
					ClipboardServiceErr({
						cause: error,
						message:
							'There was an error checking if accessibility is enabled. Please try again.',
					}),
				try: () =>
					invoke<boolean>('is_macos_accessibility_enabled', {
						askIfNotAllowed: false,
					}),
			});

			if (isAccessibilityEnabledError) return Err(isAccessibilityEnabledError);

			// If accessibility is not enabled, return NoteFluxWarning
			if (!isAccessibilityEnabled) {
				return NoteFluxWarningErr({
					title:
						'Please enable or re-enable accessibility to paste transcriptions!',
					description:
						'Accessibility must be enabled or re-enabled for NoteFlux after install or update. Follow the link below for instructions.',
					action: {
						href: '/macos-enable-accessibility',
						label: 'Open Directions',
						type: 'link',
					},
				});
			}

			// If accessibility is enabled but write still failed, propagate original error
			return Err(pasteError);
		},
	};
}
