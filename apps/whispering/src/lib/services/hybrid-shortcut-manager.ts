import type { Command } from '$lib/commands';
import type { Result } from 'wellcrafted/result';
import type { ShortcutTriggerState } from './_shortcut-trigger-state';
import {
	GlobalShortcutManagerLive,
	type Accelerator
} from './global-shortcut-manager';
import { FnShortcutManagerLive } from './fn-shortcut-manager';

/**
 * Determines if an accelerator contains the Fn modifier
 */
function containsFnModifier(accelerator: Accelerator): boolean {
	return accelerator.includes('Fn');
}

/**
 * Hybrid shortcut manager that routes to the appropriate backend
 * based on whether the shortcut contains the Fn modifier.
 *
 * - Regular shortcuts (Cmd+P, Ctrl+Shift+F) → GlobalShortcutManager (Tauri plugin)
 * - Fn shortcuts (Fn, Fn+A, Fn+Cmd+P) → FnShortcutManager (CGEventTap)
 */
export function createHybridShortcutManager() {
	console.log('[HybridShortcut] Creating hybrid shortcut manager');

	return {
		async register({
			accelerator,
			command,
			on = 'Pressed'
		}: {
			accelerator: Accelerator;
			command: Command;
			on?: ShortcutTriggerState;
		}): Promise<Result<void, any>> {
			// Route based on Fn presence
			if (containsFnModifier(accelerator)) {
				console.log(`[HybridShortcut] Routing ${accelerator} to Fn manager with on=${on}`);
				// Use Fn shortcut manager (CGEventTap)
				// Now supports 'on' parameter for push-to-talk
				return FnShortcutManagerLive.register({ accelerator, command });
			} else {
				console.log(`[HybridShortcut] Routing ${accelerator} to global manager`);
				// Use standard global shortcut manager
				return GlobalShortcutManagerLive.register({
					accelerator,
					callback: () => {
						console.log(`[HybridShortcut] Executing ${accelerator} -> ${command.id}`);
						command.callback();
					},
					on
				});
			}
		},

		async unregister(accelerator: Accelerator): Promise<Result<void, any>> {
			// Route based on Fn presence
			if (containsFnModifier(accelerator)) {
				console.log(`[HybridShortcut] Unregistering ${accelerator} from Fn manager`);
				return FnShortcutManagerLive.unregister(accelerator);
			} else {
				console.log(
					`[HybridShortcut] Unregistering ${accelerator} from global manager`
				);
				return GlobalShortcutManagerLive.unregister(accelerator);
			}
		}
	};
}

export const HybridShortcutManagerLive = createHybridShortcutManager();
