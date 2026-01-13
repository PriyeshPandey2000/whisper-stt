import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
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

// Global state shared across all manager instances
// This prevents duplicate event listeners when updating from old versions
const shortcuts = new Map<Accelerator, RegisteredShortcut>();
let globalUnlistenFns: UnlistenFn[] = [];
let listenersInitialized = false;

/**
 * Initialize event listeners once and only once.
 * This prevents duplicate event listeners during app updates.
 */
async function initializeListenersOnce() {
	if (listenersInitialized) {
		console.log('[FnShortcut] Event listeners already initialized, preventing duplicates');
		return;
	}

	console.log('[FnShortcut] Initializing event listeners (first time only)');
	listenersInitialized = true;

	try {
		// Listen for Fn tap events (quick press and release)
		const unlistenTap = await listen<string>('fn-shortcut-triggered', (event) => {
			const commandId = event.payload;
			console.log('[FnShortcut] Event received: fn-shortcut-triggered (tap)', commandId);

			// Find the matching shortcut
			for (const [accelerator, shortcut] of shortcuts.entries()) {
				if (shortcut.commandId === commandId && shortcut.on === 'Pressed') {
					shortcut.callback();
					break;
				}
			}
		});
		globalUnlistenFns.push(unlistenTap);

		// Listen for Fn press events (for push-to-talk)
		const unlistenPress = await listen<string>('fn-shortcut-pressed', (event) => {
			const commandId = event.payload;
			console.log('[FnShortcut] Event received: fn-shortcut-pressed', commandId);

			// Find the matching shortcut
			for (const [accelerator, shortcut] of shortcuts.entries()) {
				if (shortcut.commandId === commandId && shortcut.on === 'Both') {
					shortcut.callback();
					break;
				}
			}
		});
		globalUnlistenFns.push(unlistenPress);

		// Listen for Fn release events (for push-to-talk)
		const unlistenRelease = await listen<string>('fn-shortcut-released', (event) => {
			const commandId = event.payload;
			console.log('[FnShortcut] Event received: fn-shortcut-released', commandId);

			// Find the matching shortcut
			for (const [accelerator, shortcut] of shortcuts.entries()) {
				if (shortcut.commandId === commandId && shortcut.on === 'Both') {
					shortcut.callback();
					break;
				}
			}
		});
		globalUnlistenFns.push(unlistenRelease);

		console.log('[FnShortcut] All event listeners registered successfully');
	} catch (err) {
		console.error('[FnShortcut] Failed to setup event listeners:', err);
		// Reset flag so we can retry on next attempt
		listenersInitialized = false;
	}
}

export function createFnShortcutManager() {
	console.log('[FnShortcut] Creating Fn shortcut manager');

	// Initialize listeners (safe to call multiple times - will only run once)
	initializeListenersOnce();

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
				console.log(`[FnShortcut] Registering: ${accelerator} -> ${commandId}`);

				// Call Rust backend to register the Fn shortcut
				await invoke('register_fn_shortcut', {
					accelerator,
					commandId
				});

				// Store in global shortcuts map (shared across all manager instances)
				shortcuts.set(accelerator, { callback, commandId, on });
				console.log('[FnShortcut] Registration successful');
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
				console.log(`[FnShortcut] Unregistering: ${accelerator}`);

				await invoke('unregister_fn_shortcut', {
					accelerator
				});

				// Remove from global shortcuts map
				shortcuts.delete(accelerator);
				console.log('[FnShortcut] Unregistration successful');
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
