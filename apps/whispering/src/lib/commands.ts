import { rpc } from '$lib/query';

import type { ShortcutTriggerState } from './services/_shortcut-trigger-state';

type SatisfiedCommand = {
	callback: () => void;
	id: string;
	on: ShortcutTriggerState;
	title: string;
};

export const commands = [
	{
		title: 'Push to talk',
		callback: () => rpc.commands.toggleManualRecording.execute(undefined),
		id: 'pushToTalk',
		on: 'Both',
	},
	{
		title: 'Toggle recording',
		callback: () => rpc.commands.toggleManualRecording.execute(undefined),
		id: 'toggleManualRecording',
		on: 'Pressed',
	},
	{
		title: 'Start recording',
		callback: () => rpc.commands.startManualRecording.execute(undefined),
		id: 'startManualRecording',
		on: 'Pressed',
	},
	{
		title: 'Stop recording',
		callback: () => rpc.commands.stopManualRecording.execute(undefined),
		id: 'stopManualRecording',
		on: 'Pressed',
	},
	{
		title: 'Cancel recording',
		callback: () => rpc.commands.cancelManualRecording.execute(undefined),
		id: 'cancelManualRecording',
		on: 'Pressed',
	},
	{
		title: 'Start voice activated recording',
		callback: () => rpc.commands.startVadRecording.execute(undefined),
		id: 'startVadRecording',
		on: 'Pressed',
	},
	{
		title: 'Stop voice activated recording',
		callback: () => rpc.commands.stopVadRecording.execute(undefined),
		id: 'stopVadRecording',
		on: 'Pressed',
	},
	{
		title: 'Toggle voice activated recording',
		callback: () => rpc.commands.toggleVadRecording.execute(undefined),
		id: 'toggleVadRecording',
		on: 'Pressed',
	},
] as const satisfies SatisfiedCommand[];

export type Command = (typeof commands)[number];

type CommandCallbacks = Record<Command['id'], Command['callback']>;

export const commandCallbacks = commands.reduce<CommandCallbacks>(
	(acc, command) => {
		acc[command.id] = command.callback;
		return acc;
	},
	{} as CommandCallbacks,
);

// Global shortcut callbacks - these pass 'global-shortcut' as the initiation method
export const globalCommandCallbacks: CommandCallbacks = {
	pushToTalk: () => rpc.commands.toggleManualRecording.execute({ initiatedVia: 'global-shortcut' }),
	toggleManualRecording: () => rpc.commands.toggleManualRecording.execute({ initiatedVia: 'global-shortcut' }),
	startManualRecording: () => rpc.commands.startManualRecording.execute({ initiatedVia: 'global-shortcut' }),
	stopManualRecording: () => rpc.commands.stopManualRecording.execute(undefined),
	cancelManualRecording: () => rpc.commands.cancelManualRecording.execute({ initiatedVia: 'global-shortcut' }),
	startVadRecording: () => rpc.commands.startVadRecording.execute({ initiatedVia: 'global-shortcut' }),
	stopVadRecording: () => rpc.commands.stopVadRecording.execute(undefined),
	toggleVadRecording: () => rpc.commands.toggleVadRecording.execute({ initiatedVia: 'global-shortcut' }),
};
