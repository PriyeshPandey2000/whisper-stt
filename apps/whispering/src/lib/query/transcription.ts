import type { Recording } from '$lib/services/db';

import { NoteFluxErr, type NoteFluxError } from '$lib/result';
import * as services from '$lib/services';
import { settings } from '$lib/stores/settings.svelte';
import { getGroqApiKey } from '$lib/utils/embedded-keys';
import { Err, Ok, partitionResults, type Result } from 'wellcrafted/result';

import { rpc } from './';
import { defineMutation, queryClient } from './_client';
import { notify } from './notify';
import { recordings } from './recordings';

const transcriptionKeys = {
	isTranscribing: ['transcription', 'isTranscribing'] as const,
} as const;

export const transcription = {
	isCurrentlyTranscribing() {
		return (
			queryClient.isMutating({
				mutationKey: transcriptionKeys.isTranscribing,
			}) > 0
		);
	},
	transcribeRecording: defineMutation({
		mutationKey: transcriptionKeys.isTranscribing,
		resultMutationFn: async (
			recording: Recording,
		): Promise<Result<string, NoteFluxError>> => {
			if (!recording.blob) {
				return NoteFluxErr({
					title: '⚠️ Recording blob not found',
					description: "Your recording doesn't have a blob to transcribe.",
				});
			}
			const { error: setRecordingTranscribingError } =
				await recordings.updateRecording.execute({
					...recording,
					transcriptionStatus: 'TRANSCRIBING',
				});
			if (setRecordingTranscribingError) {
				notify.warning.execute({
					title:
						'⚠️ Unable to set recording transcription status to transcribing',
					description: 'Continuing with the transcription process...',
					action: {
						error: setRecordingTranscribingError,
						type: 'more-details',
					},
				});
			}
			const { data: transcribedText, error: transcribeError } =
				await transcribeBlob(recording.blob);
			if (transcribeError) {
				const { error: setRecordingTranscribingError } =
					await recordings.updateRecording.execute({
						...recording,
						transcriptionStatus: 'FAILED',
					});
				if (setRecordingTranscribingError) {
					notify.warning.execute({
						title: '⚠️ Unable to update recording after transcription',
						description:
							"Transcription failed but unable to update recording's transcription status in database",
						action: {
							error: setRecordingTranscribingError,
							type: 'more-details',
						},
					});
				}
				return Err(transcribeError);
			}

			const { error: setRecordingTranscribedTextError } =
				await recordings.updateRecording.execute({
					...recording,
					transcribedText,
					transcriptionStatus: 'DONE',
				});
			if (setRecordingTranscribedTextError) {
				notify.warning.execute({
					title: '⚠️ Unable to update recording after transcription',
					description:
						"Transcription completed but unable to update recording's transcribed text and status in database",
					action: {
						error: setRecordingTranscribedTextError,
						type: 'more-details',
					},
				});
			}
			return Ok(transcribedText);
		},
	}),

	transcribeRecordings: defineMutation({
		mutationKey: transcriptionKeys.isTranscribing,
		resultMutationFn: async (recordings: Recording[]) => {
			const results = await Promise.all(
				recordings.map(async (recording) => {
					if (!recording.blob) {
						return NoteFluxErr({
							title: '⚠️ Recording blob not found',
							description: "Your recording doesn't have a blob to transcribe.",
						});
					}
					return await transcribeBlob(recording.blob);
				}),
			);
			const partitionedResults = partitionResults(results);
			return Ok(partitionedResults);
		},
	}),
};

async function transcribeBlob(
	blob: Blob,
): Promise<Result<string, NoteFluxError>> {
	const selectedService =
		settings.value['transcription.selectedTranscriptionService'];

	// Log transcription request
	const startTime = Date.now();
	rpc.analytics.logEvent.execute({
		provider: selectedService,
		type: 'transcription_requested',
	});

	const transcriptionResult: Result<string, NoteFluxError> =
		await (async () => {
			switch (selectedService) {
				// COMMENTED OUT: BYOK providers - using only Groq for SaaS model
				// case 'Deepgram':
				// 	return await services.transcriptions.deepgram.transcribe(blob, {
				// 		apiKey: settings.value['apiKeys.deepgram'],
				// 		modelName: settings.value['transcription.deepgram.model'],
				// 		outputLanguage: settings.value['transcription.outputLanguage'],
				// 		prompt: settings.value['transcription.prompt'],
				// 		temperature: settings.value['transcription.temperature'],
				// 	});
				// case 'ElevenLabs':
				// 	return await services.transcriptions.elevenlabs.transcribe(blob, {
				// 		apiKey: settings.value['apiKeys.elevenlabs'],
				// 		modelName: settings.value['transcription.elevenlabs.model'],
				// 		outputLanguage: settings.value['transcription.outputLanguage'],
				// 		prompt: settings.value['transcription.prompt'],
				// 		temperature: settings.value['transcription.temperature'],
				// 	});
				case 'Groq':
					return await services.transcriptions.groq.transcribe(blob, {
						apiKey: getGroqApiKey(),
						modelName: settings.value['transcription.groq.model'],
						outputLanguage: settings.value['transcription.outputLanguage'],
						prompt: settings.value['transcription.prompt'],
						temperature: settings.value['transcription.temperature'],
					});
				// case 'OpenAI':
				// 	return await services.transcriptions.openai.transcribe(blob, {
				// 		apiKey: settings.value['apiKeys.openai'],
				// 		modelName: settings.value['transcription.openai.model'],
				// 		outputLanguage: settings.value['transcription.outputLanguage'],
				// 		prompt: settings.value['transcription.prompt'],
				// 		temperature: settings.value['transcription.temperature'],
				// 	});
				// case 'speaches':
				// 	return await services.transcriptions.speaches.transcribe(blob, {
				// 		baseUrl: settings.value['transcription.speaches.baseUrl'],
				// 		modelId: settings.value['transcription.speaches.modelId'],
				// 		outputLanguage: settings.value['transcription.outputLanguage'],
				// 		prompt: settings.value['transcription.prompt'],
				// 		temperature: settings.value['transcription.temperature'],
				// 	});
				default:
					return NoteFluxErr({
						title: '⚠️ Unsupported transcription service',
						description: `The selected service "${selectedService}" is not supported in SaaS mode.`,
					});
			}
		})();

	// Log transcription result
	const duration = Date.now() - startTime;
	if (transcriptionResult.error) {
		rpc.analytics.logEvent.execute({
			error_description: transcriptionResult.error.description,
			error_title: transcriptionResult.error.title,
			provider: selectedService,
			type: 'transcription_failed',
		});
	} else {
		rpc.analytics.logEvent.execute({
			duration,
			provider: selectedService,
			type: 'transcription_completed',
		});

		// Track usage for billing/analytics (fire-and-forget, won't block)
		// Only track for services that charge by duration (like Groq)
		if (selectedService === 'Groq') {
			try {
				// Import usage tracking dynamically to avoid circular imports
				const { trackUsage, getAudioDurationFromBlob } = await import('$lib/services/usage-tracking');
				const durationMinutes = await getAudioDurationFromBlob(blob);
				trackUsage({
					durationMinutes,
					estimatedCost: 0, // Will be calculated in trackUsage
					provider: selectedService,
					fileName: 'audio-recording' // Could be enhanced to use actual filename
				});
			} catch (error) {
				console.warn('Usage tracking failed, but transcription succeeded:', error);
				// Don't fail the transcription if usage tracking fails
			}
		}
	}

	return transcriptionResult;
}
