import { analytics } from './analytics';
import * as auth from './auth';
import { ClipboardServiceLive } from './clipboard';
import * as completions from './completion';
import { DbServiceLive } from './db';
import { DownloadServiceLive } from './download';
import { GlobalShortcutManagerLive } from './global-shortcut-manager';
import { HybridShortcutManagerLive } from './hybrid-shortcut-manager';
import { LocalShortcutManagerLive } from './local-shortcut-manager';
import { NotificationServiceLive } from './notifications';
import { OsServiceLive } from './os';
import { PermissionMonitorLive } from './permission-monitor';
import { RecorderServiceLive } from './recorder';
import { PlaySoundServiceLive } from './sound';
import { ToastServiceLive } from './toast';
import * as transcriptions from './transcription';
import { asDeviceIdentifier } from './types';
import * as usageTracking from './usage-tracking';
import { VadServiceLive } from './vad-recorder';

/**
 * Unified services object providing consistent access to all services.
 */
export {
	analytics,
	asDeviceIdentifier,
	auth,
	ClipboardServiceLive as clipboard,
	completions,
	DbServiceLive as db,
	DownloadServiceLive as download,
	GlobalShortcutManagerLive as globalShortcutManager,
	HybridShortcutManagerLive as hybridShortcutManager,
	LocalShortcutManagerLive as localShortcutManager,
	NotificationServiceLive as notification,
	OsServiceLive as os,
	PermissionMonitorLive as permissionMonitor,
	RecorderServiceLive as recorder,
	PlaySoundServiceLive as sound,
	ToastServiceLive as toast,
	transcriptions,
	usageTracking,
	VadServiceLive as vad,
};
