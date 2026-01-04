import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ShortcutTriggerState } from './_shortcut-trigger-state';
import { createTaggedError } from 'wellcrafted/error';
import { Err, Ok, type Result } from 'wellcrafted/result';

type Accelerator = string;

const { FnShortcutServiceErr, FnShortcutServiceError } = createTaggedError(
	'FnShortcutServiceError'
);
type FnShortcutServiceError = ReturnType<typeof FnShortcutServiceError>;

const { FnNotSupportedErr, FnNotSupportedError } = createTaggedError('FnNotSupportedError');
type FnNotSupportedError = ReturnType<typeof FnNotSupportedError>;

type RegisteredShortcut = {
	callback: () => void;
	commandId: string;
	on: ShortcutTriggerState;
};

export function createFnShortcutManager() {
	// Track registered shortcuts with their callbacks and trigger state
	const shortcuts = new Map<Accelerator, RegisteredShortcut>();

	// console.log('[FnShortcut] Creating Fn shortcut manager');

	// Listen for Fn tap events (quick press and release)
	listen<string>('fn-shortcut-triggered', (event) => {
		const commandId = event.payload;
		console.log('[FnShortcut] Event received: fn-shortcut-triggered (tap)', commandId);

		// Find the matching shortcut
		for (const [accelerator, shortcut] of shortcuts.entries()) {
			if (shortcut.commandId === commandId && shortcut.on === 'Pressed') {
				// console.log(`[FnShortcut] Executing tap command: ${shortcut.commandId} (${accelerator})`);
				shortcut.callback();
				break;
			}
		}
	}).catch((err) => {
		console.error('[FnShortcut] Failed to setup tap event listener:', err);
	});

	// Listen for Fn press events (for push-to-talk)
	listen<string>('fn-shortcut-pressed', (event) => {
		const commandId = event.payload;
		console.log('[FnShortcut] Event received: fn-shortcut-pressed', commandId);

		// Find the matching shortcut
		for (const [accelerator, shortcut] of shortcuts.entries()) {
			if (shortcut.commandId === commandId && shortcut.on === 'Both') {
				// console.log(`[FnShortcut] Executing press for push-to-talk: ${shortcut.commandId} (${accelerator})`);
				shortcut.callback();
				break;
			}
		}
	}).catch((err) => {
		console.error('[FnShortcut] Failed to setup press event listener:', err);
	});

	// Listen for Fn release events (for push-to-talk)
	listen<string>('fn-shortcut-released', (event) => {
		const commandId = event.payload;
		console.log('[FnShortcut] Event received: fn-shortcut-released', commandId);

		// Find the matching shortcut
		for (const [accelerator, shortcut] of shortcuts.entries()) {
			if (shortcut.commandId === commandId && shortcut.on === 'Both') {
				// console.log(`[FnShortcut] Executing release for push-to-talk: ${shortcut.commandId} (${accelerator})`);
				shortcut.callback();
				break;
			}
		}
	}).catch((err) => {
		console.error('[FnShortcut] Failed to setup release event listener:', err);
	});

	return {
		async register({
			accelerator,
			commandId,
			callback,
			on
		}: {
			accelerator: Accelerator;
			callback: () => void;
			commandId: string;
			on: ShortcutTriggerState;
		}): Promise<Result<void, FnShortcutServiceError | FnNotSupportedError>> {
			try {
				// console.log(`[FnShortcut] Registering: ${accelerator} -> ${commandId}`);

				// Call Rust backend to register the Fn shortcut
				await invoke('register_fn_shortcut', {
					accelerator,
					commandId
				});

				shortcuts.set(accelerator, { callback, commandId, on });
				// console.log('[FnShortcut] Registration successful');
				return Ok(undefined);
			} catch (error: any) {
				console.error('[FnShortcut] Registration failed:', error);

				if (error?.includes?.('only supported on macOS')) {
					return FnNotSupportedErr({
						cause: error,
						message: 'Fn key shortcuts are only supported on macOS'
					});
				}

				return FnShortcutServiceErr({
					cause: error,
					context: { accelerator, commandId },
					message: `Failed to register Fn shortcut: ${error}`
				});
			}
		},

		async unregister(
			accelerator: Accelerator
		): Promise<Result<void, FnShortcutServiceError>> {
			try {
				// console.log(`[FnShortcut] Unregistering: ${accelerator}`);

				await invoke('unregister_fn_shortcut', {
					accelerator
				});

				shortcuts.delete(accelerator);
				// console.log('[FnShortcut] Unregistration successful');
				return Ok(undefined);
			} catch (error: any) {
				console.error('[FnShortcut] Unregistration failed:', error);

				return FnShortcutServiceErr({
					cause: error,
					context: { accelerator },
					message: `Failed to unregister Fn shortcut: ${error}`
				});
			}
		}
	};
}

export const FnShortcutManagerLive = createFnShortcutManager();
