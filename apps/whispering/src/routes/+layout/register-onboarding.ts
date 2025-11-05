import { rpc } from '$lib/query';
import {
	getSelectedTranscriptionService,
	isTranscriptionServiceConfigured,
} from '$lib/settings/transcription-validation';
import { setupDefaultTransformation } from './setup-default-transformation';

/**
 * Checks if the user has configured the necessary API keys/settings for their selected transcription service.
 * Shows an onboarding toast if configuration is missing.
 * Also sets up default transformation for new users.
 */
export function registerOnboarding() {
	// Set up default transformation for new users
	setupDefaultTransformation();
	const selectedService = getSelectedTranscriptionService();

	if (!selectedService) {
		rpc.notify.info.execute({
			title: 'Welcome to NoteFlux!',
			description: 'Please select a transcription service to get started.',
			action: {
				href: '/settings/transcription',
				label: 'Configure',
				type: 'link',
			},
			persist: true,
		});
		return;
	}

	if (!isTranscriptionServiceConfigured(selectedService)) {
		const missingConfig =
			selectedService.type === 'api'
				? `${selectedService.name} API key`
				: `${selectedService.name} server URL`;

		rpc.notify.info.execute({
			title: 'Welcome to NoteFlux!',
			description: `Please configure your ${missingConfig} to get started.`,
			action: {
				href: '/settings/transcription',
				label: 'Configure',
				type: 'link',
			},
			persist: true,
		});
	}
}
