import type { MaybePromise, NoteFluxError } from '$lib/result';
import type { Result } from 'wellcrafted/result';

import { createTaggedError } from 'wellcrafted/error';

const { ClipboardServiceErr, ClipboardServiceError } = createTaggedError(
	'ClipboardServiceError',
);
export type ClipboardService = {
	/**
	 * Copies text to the system clipboard.
	 * @param text The text to copy to the clipboard.
	 */
	copyToClipboard: (
		text: string,
	) => Promise<Result<void, ClipboardServiceError>>;

	/**
	 * Types text directly at the current cursor position, character by character.
	 * This bypasses the clipboard entirely and is ideal for situations where focus
	 * may have changed or clipboard paste might not work reliably.
	 *
	 * **Note**: This is slower than paste for large text blocks but more reliable.
	 * Best used for global shortcuts where cursor focus needs to be maintained.
	 *
	 * - Desktop: Uses Enigo to simulate keyboard typing
	 * - Web: Not implemented (falls back to paste)
	 * - Mobile: Not implemented (falls back to paste)
	 *
	 * @param keepWindowVisible If true, keeps the main window visible
	 * @param refocusWindow If true, refocuses the window before pasting (for onboarding)
	 */
	typeAtCursor: (
		text: string,
		keepWindowVisible?: boolean,
		refocusWindow?: boolean,
	) => Promise<Result<void, ClipboardServiceError>>;

	/**
	 * Pastes text from the clipboard at the current cursor position.
	 * Simulates the standard paste keyboard shortcut (Cmd+V on macOS, Ctrl+V elsewhere).
	 *
	 * **Note**: The clipboard must already contain the text you want to paste.
	 * Call `copyToClipboard` first if needed.
	 *
	 * - Desktop: Simulates Cmd/Ctrl+V keyboard shortcut
	 * - Web: Uses browser paste API or extension messaging
	 * - Mobile: Triggers native paste action
	 */
	pasteFromClipboard: () => MaybePromise<
		Result<void, ClipboardServiceError | NoteFluxError>
	>;
};
export { ClipboardServiceErr, ClipboardServiceError };

type ClipboardServiceError = ReturnType<typeof ClipboardServiceError>;
