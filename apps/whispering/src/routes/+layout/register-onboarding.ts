import { rpc } from '$lib/query';
import {
	getSelectedTranscriptionService,
	isTranscriptionServiceConfigured,
} from '$lib/settings/transcription-validation';
import { settings } from '$lib/stores/settings.svelte';
import { setupDefaultTransformation } from './setup-default-transformation';

/**
 * Sets up default transformation for new users.
 * Onboarding toasts are disabled since API keys are embedded through build process.
 */
export function registerOnboarding() {
	// Set up default transformation for new users
	setupDefaultTransformation();
	
	// Onboarding toasts disabled - API keys are embedded through GitHub build
	
	// const selectedService = getSelectedTranscriptionService();

	// if (!selectedService) {
	// 	rpc.notify.info.execute({
	// 		title: 'Welcome to NoteFlux!',
	// 		description: 'Please select a transcription service to get started.',
	// 		action: {
	// 			href: '/settings/transcription',
	// 			label: 'Configure',
	// 			type: 'link',
	// 		},
	// 		persist: true,
	// 	});
	// 	return;
	// }

	// if (!isTranscriptionServiceConfigured(selectedService)) {
	// 	const missingConfig =
	// 		selectedService.type === 'api'
	// 			? `${selectedService.name} API key`
	// 			: `${selectedService.name} server URL`;

	// 	rpc.notify.info.execute({
	// 		title: 'Welcome to NoteFlux!',
	// 		description: `Please configure your ${missingConfig} to get started.`,
	// 		action: {
	// 			href: '/settings/transcription',
	// 			label: 'Configure',
	// 			type: 'link',
	// 		},
	// 		persist: true,
	// 	});
	// }
}
