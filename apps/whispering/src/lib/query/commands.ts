import { fromTaggedErr, fromTaggedError, NoteFluxErr } from '$lib/result';
import { DbServiceErr } from '$lib/services/db';
import { settings } from '$lib/stores/settings.svelte';
import { authRequiredDialog } from '$lib/stores/auth-required-dialog.svelte';
import { nanoid } from 'nanoid/non-secure';
import { Err, Ok } from 'wellcrafted/result';

import { rpc } from './';
import { defineMutation } from './_client';
import { delivery } from './delivery';
import { notify } from './notify';
import { recorder } from './recorder';
import { recordings } from './recordings';
import { sound } from './sound';
import { transcription } from './transcription';
import { transformations } from './transformations';
import { transformer } from './transformer';
import { vadRecorder } from './vad-recorder';

// Track manual recording start time for duration calculation
let manualRecordingStartTime: null | number = null;

// Track how the current recording was initiated
let recordingInitiatedVia: 'global-shortcut' | 'local' | null = null;

// Track VAD recording state for debouncing and initiation context
let vadInitiatedVia: 'global-shortcut' | 'local' | null = null;
let vadSessionActive = false;
let vadDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Helper function to check authentication and show dialog if not authenticated
// This ensures users are authenticated before they can start recording
async function checkAuthAndShowDialog(): Promise<boolean> {
	try {
		const { supabase } = await import('$lib/services/auth/supabase-client');
		const { data: { user } } = await supabase.auth.getUser();
		
		if (!user) {
			// Show auth required dialog and bring window to front
			if (window.__TAURI_INTERNALS__) {
				try {
					const { getCurrentWindow } = await import('@tauri-apps/api/window');
					const currentWindow = getCurrentWindow();
					await currentWindow.show();
					await currentWindow.setAlwaysOnTop(true);
					await currentWindow.setFocus();
					
					setTimeout(() => {
						currentWindow.setAlwaysOnTop(false).catch(() => {});
					}, 2000);
				} catch (windowError) {
					console.warn('Failed to bring window to front:', windowError);
				}
			}
			
			authRequiredDialog.open();
			return false;
		}
		
		return true;
	} catch (error) {
		console.error('Auth check failed:', error);
		return false;
	}
}

// Internal mutations for manual recording
const startManualRecording = defineMutation({
	mutationKey: ['commands', 'startManualRecording'] as const,
	resultMutationFn: async ({ initiatedVia = 'local' }: { initiatedVia?: 'global-shortcut' | 'local' } = {}) => {
		console.log('🎙️ [COMMAND] startManualRecording called with initiatedVia:', initiatedVia);
		
		// Check authentication first
		const isAuthenticated = await checkAuthAndShowDialog();
		if (!isAuthenticated) {
			return NoteFluxErr({
				title: '🔐 Authentication Required',
				description: 'Please sign in to start recording',
			});
		}
		
		const toastId = nanoid();
		notify.loading.execute({
			title: '🎙️ Preparing to record...',
			description: 'Setting up your recording environment...',
			id: toastId,
		});
		const { data: deviceAcquisitionOutcome, error: startRecordingError } =
			await recorder.startRecording.execute({ toastId });

		if (startRecordingError) {
			notify.error.execute({ id: toastId, ...startRecordingError });
			return Err(startRecordingError);
		}

		switch (deviceAcquisitionOutcome.outcome) {
			case 'success': {
				notify.success.execute({
					title: '🎙️ NoteFlux is recording...',
					description: 'Speak now and stop recording when done',
					id: toastId,
				});
				break;
			}
			case 'fallback': {
				settings.updateKey(
					'recording.selectedDeviceId',
					deviceAcquisitionOutcome.fallbackDeviceId,
				);
				switch (deviceAcquisitionOutcome.reason) {
					case 'no-device-selected': {
						notify.info.execute({
							title: '🎙️ Switched to available microphone',
							description:
								'No microphone was selected, so we automatically connected to an available one. You can update your selection in settings.',
							action: {
								href: '/settings/recording',
								label: 'Open Settings',
								type: 'link',
							},
							id: toastId,
						});
						break;
					}
					case 'preferred-device-unavailable': {
						notify.info.execute({
							title: '🎙️ Switched to different microphone',
							description:
								"Your previously selected microphone wasn't found, so we automatically connected to an available one.",
							action: {
								href: '/settings/recording',
								label: 'Open Settings',
								type: 'link',
							},
							id: toastId,
						});
						break;
					}
				}
			}
		}
		// Track start time and initiation method for duration calculation and pasting behavior
		manualRecordingStartTime = Date.now();
		recordingInitiatedVia = initiatedVia;
		console.info('Recording started');
		sound.playSoundIfEnabled.execute('manual-start');
		return Ok(undefined);
	},
});

const stopManualRecording = defineMutation({
	mutationKey: ['commands', 'stopManualRecording'] as const,
	resultMutationFn: async () => {
		const toastId = nanoid();
		notify.loading.execute({
			title: '⏸️ Stopping recording...',
			description: 'Finalizing your audio capture...',
			id: toastId,
		});
		const { data: blob, error: stopRecordingError } =
			await recorder.stopRecording.execute({ toastId });
		if (stopRecordingError) {
			notify.error.execute({ id: toastId, ...stopRecordingError });
			return Err(stopRecordingError);
		}

		notify.success.execute({
			title: '🎙️ Recording stopped',
			description: 'Your recording has been saved',
			id: toastId,
		});
		console.info('Recording stopped');
		sound.playSoundIfEnabled.execute('manual-stop');

		// Log manual recording completion
		let duration: number | undefined;
		const initiatedVia = recordingInitiatedVia || 'local';
		if (manualRecordingStartTime) {
			duration = Date.now() - manualRecordingStartTime;
			manualRecordingStartTime = null; // Reset for next recording
		}
		recordingInitiatedVia = null; // Reset for next recording

		rpc.analytics.logEvent.execute({
			blob_size: blob.size,
			duration,
			type: 'manual_recording_completed',
		});

		await processRecordingPipeline({
			blob,
			completionDescription: 'Recording saved and session closed successfully',
			completionTitle: '✨ Recording Complete!',
			toastId,
			initiatedVia,
		});

		return Ok(undefined);
	},
});

// Internal mutations for VAD recording
const startVadRecording = defineMutation({
	mutationKey: ['commands', 'startVadRecording'] as const,
	resultMutationFn: async ({ initiatedVia = 'local' }: { initiatedVia?: 'global-shortcut' | 'local' } = {}) => {
		// Check authentication first
		const isAuthenticated = await checkAuthAndShowDialog();
		if (!isAuthenticated) {
			return NoteFluxErr({
				title: '🔐 Authentication Required',
				description: 'Please sign in to start recording',
			});
		}
		
		// Store the initiation context
		vadInitiatedVia = initiatedVia;
		vadSessionActive = true;
		
		// Clear any existing debounce timeout
		if (vadDebounceTimeout) {
			clearTimeout(vadDebounceTimeout);
			vadDebounceTimeout = null;
		}
		
		const toastId = nanoid();
		console.info('Starting voice activated capture');
		notify.loading.execute({
			title: '🎙️ Starting voice activated capture',
			description: 'Your voice activated capture is starting...',
			id: toastId,
		});
		const { data: deviceAcquisitionOutcome, error: startActiveListeningError } =
			await vadRecorder.startActiveListening.execute({
				onSpeechEnd: async (blob) => {
					// Debouncing: ignore if session is not active or already processing
					if (!vadSessionActive) {
						console.log('VAD onSpeechEnd ignored: session not active');
						return;
					}
					
					// Set session as inactive to prevent multiple triggers
					vadSessionActive = false;
					
					// Set up debounce timeout to prevent rapid retriggering
					vadDebounceTimeout = setTimeout(() => {
						vadSessionActive = true;
						vadDebounceTimeout = null;
					}, 2000); // 2 second debounce
					
					const toastId = nanoid();
					notify.success.execute({
						title: '🎙️ Voice activated speech captured',
						description: 'Your voice activated speech has been captured.',
						id: toastId,
					});
					console.info('Voice activated speech captured');
					// sound.playSoundIfEnabled.execute('vad-capture'); // Commented out until VAD mode is re-enabled

					// Log VAD recording completion
					rpc.analytics.logEvent.execute({
						blob_size: blob.size,
						type: 'vad_recording_completed',
						// VAD doesn't track duration by default
					});

					await processRecordingPipeline({
						blob,
						completionDescription:
							'Voice activated capture complete! Ready for another take',
						completionTitle: '✨ Voice activated capture complete!',
						toastId,
						initiatedVia: vadInitiatedVia || 'local', // Use the stored initiation context
					});
				},
				onSpeechStart: () => {
					notify.success.execute({
						title: '🎙️ Speech started',
						description: 'Recording started. Speak clearly and loudly.',
					});
				},
			});
		if (startActiveListeningError) {
			notify.error.execute({ id: toastId, ...startActiveListeningError });
			return Err(startActiveListeningError);
		}

		// Handle device acquisition outcome
		switch (deviceAcquisitionOutcome.outcome) {
			case 'success': {
				notify.success.execute({
					title: '🎙️ Voice activated capture started',
					description: 'Your voice activated capture has been started.',
					id: toastId,
				});
				break;
			}
			case 'fallback': {
				settings.updateKey(
					'recording.selectedDeviceId',
					deviceAcquisitionOutcome.fallbackDeviceId,
				);
				switch (deviceAcquisitionOutcome.reason) {
					case 'no-device-selected': {
						notify.info.execute({
							title: '🎙️ VAD started with available microphone',
							description:
								'No microphone was selected for VAD, so we automatically connected to an available one. You can update your selection in settings.',
							action: {
								href: '/settings/recording',
								label: 'Open Settings',
								type: 'link',
							},
							id: toastId,
						});
						break;
					}
					case 'preferred-device-unavailable': {
						notify.info.execute({
							title: '🎙️ VAD switched to different microphone',
							description:
								"Your previously selected VAD microphone wasn't found, so we automatically connected to an available one.",
							action: {
								href: '/settings/recording',
								label: 'Open Settings',
								type: 'link',
							},
							id: toastId,
						});
						break;
					}
				}
			}
		}

		// sound.playSoundIfEnabled.execute('vad-start'); // Commented out until VAD mode is re-enabled
		return Ok(undefined);
	},
});

const stopVadRecording = defineMutation({
	mutationKey: ['commands', 'stopVadRecording'] as const,
	resultMutationFn: async () => {
		const toastId = nanoid();
		console.info('Stopping voice activated capture');
		notify.loading.execute({
			title: '⏸️ Stopping voice activated capture...',
			description: 'Finalizing your voice activated capture...',
			id: toastId,
		});
		const { error: stopVadError } =
			await vadRecorder.stopActiveListening.execute(undefined);
		
		// Clean up VAD state regardless of success/failure
		vadInitiatedVia = null;
		vadSessionActive = false;
		if (vadDebounceTimeout) {
			clearTimeout(vadDebounceTimeout);
			vadDebounceTimeout = null;
		}
		
		if (stopVadError) {
			notify.error.execute({ id: toastId, ...stopVadError });
			return Err(stopVadError);
		}
		notify.success.execute({
			title: '🎙️ Voice activated capture stopped',
			description: 'Your voice activated capture has been stopped.',
			id: toastId,
		});
		// sound.playSoundIfEnabled.execute('vad-stop'); // Commented out until VAD mode is re-enabled
		return Ok(undefined);
	},
});

export const commands = {
	// Start manual recording
	startManualRecording,

	// Cancel manual recording
	cancelManualRecording: defineMutation({
		mutationKey: ['commands', 'cancelManualRecording'] as const,
		resultMutationFn: async ({ initiatedVia = 'local' }: { initiatedVia?: 'global-shortcut' | 'local' } = {}) => {
			const toastId = nanoid();
			notify.loading.execute({
				title: '⏸️ Canceling recording...',
				description: 'Cleaning up recording session...',
				id: toastId,
			});
			const { data: cancelRecordingResult, error: cancelRecordingError } =
				await recorder.cancelRecording.execute({ toastId });
			if (cancelRecordingError) {
				notify.error.execute({ id: toastId, ...cancelRecordingError });
				return Err(cancelRecordingError);
			}
			switch (cancelRecordingResult.status) {
				case 'cancelled': {
					// Session cleanup is now handled internally by the recorder service
					// Reset start time and initiation method if recording was cancelled
					manualRecordingStartTime = null;
					recordingInitiatedVia = null;
					notify.success.execute({
						title: '✅ All Done!',
						description: 'Recording cancelled successfully',
						id: toastId,
					});
					sound.playSoundIfEnabled.execute('manual-cancel');
					console.info('Recording cancelled');
					break;
				}
				case 'no-recording': {
					notify.info.execute({
						title: 'No active recording',
						description: 'There is no recording in progress to cancel.',
						id: toastId,
					});
					break;
				}
			}
			return Ok(undefined);
		},
	}),
	startVadRecording,
	stopManualRecording,

	stopVadRecording,

	// Toggle manual recording
	toggleManualRecording: defineMutation({
		mutationKey: ['commands', 'toggleManualRecording'] as const,
		resultMutationFn: async ({ initiatedVia = 'local' }: { initiatedVia?: 'global-shortcut' | 'local' } = {}) => {
			console.log('🔄 [COMMAND] toggleManualRecording called with initiatedVia:', initiatedVia);
			const { data: currentRecordingId, error: getRecordingIdError } =
				await recorder.getCurrentRecordingId.fetch();
			if (getRecordingIdError) {
				notify.error.execute(getRecordingIdError);
				return Err(getRecordingIdError);
			}
			if (currentRecordingId) {
				return await stopManualRecording.execute(undefined);
			}
			return await startManualRecording.execute({ initiatedVia });
		},
	}),

	// Toggle VAD recording
	toggleVadRecording: defineMutation({
		mutationKey: ['commands', 'toggleVadRecording'] as const,
		resultMutationFn: async ({ initiatedVia = 'local' }: { initiatedVia?: 'global-shortcut' | 'local' } = {}) => {
			const { data: vadState } = await vadRecorder.getVadState.fetch();
			if (vadState === 'LISTENING' || vadState === 'SPEECH_DETECTED') {
				return await stopVadRecording.execute(undefined);
			}
			return await startVadRecording.execute({ initiatedVia });
		},
	}),

	// Upload recordings (supports multiple files)
	uploadRecordings: defineMutation({
		mutationKey: ['recordings', 'uploadRecordings'] as const,
		resultMutationFn: async ({ files }: { files: File[] }) => {
			// Partition files into valid and invalid in a single pass
			const { invalid: invalidFiles, valid: validFiles } = files.reduce<{
				invalid: File[];
				valid: File[];
			}>(
				(acc, file) => {
					const isValid =
						file.type.startsWith('audio/') || file.type.startsWith('video/');
					acc[isValid ? 'valid' : 'invalid'].push(file);
					return acc;
				},
				{ invalid: [], valid: [] },
			);

			if (validFiles.length === 0) {
				return DbServiceErr({
					cause: undefined,
					context: { providedFiles: files.length },
					message: 'No valid audio or video files found.',
				});
			}

			if (invalidFiles.length > 0) {
				notify.warning.execute({
					title: '⚠️ Some files were skipped',
					description: `${invalidFiles.length} file(s) were not audio or video files`,
				});
			}

			// Process all valid files in parallel
			await Promise.all(
				validFiles.map(async (file) => {
					const arrayBuffer = await file.arrayBuffer();
					const audioBlob = new Blob([arrayBuffer], { type: file.type });
					
					// Log file upload event
					rpc.analytics.logEvent.execute({
						blob_size: audioBlob.size,
						type: 'file_uploaded',
					});

					// Each file gets its own toast notification
					const toastId = nanoid();
					await processRecordingPipeline({
						blob: audioBlob,
						completionDescription: file.name,
						completionTitle: '📁 File uploaded successfully!',
						toastId,
						initiatedVia: 'local', // File uploads are always local
					});
				}),
			);

			return Ok({
				processedCount: validFiles.length,
				skippedCount: invalidFiles.length,
			});
		},
	}),
};

/**
 * Processes a recording through the full pipeline: save → transcribe → transform
 *
 * This function handles the complete flow from recording creation through transcription:
 * 1. Creates recording metadata and saves to database
 * 2. Handles database save errors
 * 3. Shows completion toast
 * 4. Executes transcription flow
 * 5. Applies transformation if one is selected
 */
async function processRecordingPipeline({
	blob,
	completionDescription,
	completionTitle,
	toastId,
	initiatedVia = 'local',
}: {
	blob: Blob;
	completionDescription: string;
	completionTitle: string;
	toastId: string;
	initiatedVia?: 'global-shortcut' | 'local';
}) {
	const now = new Date().toISOString();
	const newRecordingId = nanoid();

	const { data: createdRecording, error: createRecordingError } =
		await recordings.createRecording.execute({
			title: '',
			blob,
			createdAt: now,
			id: newRecordingId,
			subtitle: '',
			timestamp: now,
			transcribedText: '',
			transcriptionStatus: 'UNPROCESSED',
			updatedAt: now,
		});

	if (createRecordingError) {
		notify.error.execute({
			title:
				'❌ Your recording was captured but could not be saved to the database.',
			description: createRecordingError.message,
			action: { error: createRecordingError, type: 'more-details' },
			id: toastId,
		});
		return;
	}

	notify.success.execute({
		title: completionTitle,
		description: completionDescription,
		id: toastId,
	});

	const transcribeToastId = nanoid();
	notify.loading.execute({
		title: '📋 Transcribing...',
		description: 'Your recording is being transcribed...',
		id: transcribeToastId,
	});

	const { data: transcribedText, error: transcribeError } =
		await transcription.transcribeRecording.execute(createdRecording);

	if (transcribeError) {
		if (transcribeError.name === 'NoteFluxError') {
			notify.error.execute({ id: transcribeToastId, ...transcribeError });
			return;
		}
		notify.error.execute({
			title: '❌ Failed to transcribe recording',
			description: 'Your recording could not be transcribed.',
			action: { error: transcribeError, type: 'more-details' },
			id: transcribeToastId,
		});
		return;
	}

	sound.playSoundIfEnabled.execute('transcriptionComplete');

	// COMMENTED OUT: Raw text delivery when transformation is selected
	// This ensures only transformed text goes to clipboard/cursor when transformation is applied
	// await delivery.deliverTranscriptionResult.execute({
	// 	text: transcribedText,
	// 	toastId: transcribeToastId,
	// 	initiatedVia,
	// });

	// Determine if we need to chain to transformation
	const transformationId =
		settings.value['transformations.selectedTransformationId'];

	// If no transformation is selected, deliver the raw transcription result and exit
	if (!transformationId) {
		await delivery.deliverTranscriptionResult.execute({
			text: transcribedText,
			toastId: transcribeToastId,
			initiatedVia,
		});
		return;
	}

	// When transformation is selected, the raw text delivery above is skipped
	// The final transformed text will be delivered via deliverTransformationResult
	const { data: transformation, error: getTransformationError } =
		await transformations.queries
			.getTransformationById(() => transformationId)
			.fetch();

	const transformationNoLongerExists = !transformation;

	if (getTransformationError) {
		notify.error.execute(
			fromTaggedError(getTransformationError, {
				title: '❌ Failed to get transformation',
				action: { error: getTransformationError, type: 'more-details' },
			}),
		);
		return;
	}

	if (transformationNoLongerExists) {
		settings.updateKey('transformations.selectedTransformationId', null);
		notify.warning.execute({
			title: '⚠️ No matching transformation found',
			description:
				'No matching transformation found. Please select a different transformation.',
			action: {
				href: '/transformations',
				label: 'Select a different transformation',
				type: 'link',
			},
		});
		return;
	}

	const transformToastId = nanoid();
	notify.loading.execute({
		title: '🔄 Running transformation...',
		description:
			'Applying your selected transformation to the transcribed text...',
		id: transformToastId,
	});
	const { data: transformationRun, error: transformError } =
		await transformer.transformRecording.execute({
			recordingId: createdRecording.id,
			transformation,
		});
	if (transformError) {
		notify.error.execute({ id: transformToastId, ...transformError });
		return;
	}

	if (transformationRun.status === 'failed') {
		notify.error.execute({
			title: '⚠️ Transformation error',
			description: transformationRun.error,
			action: { error: transformationRun.error, type: 'more-details' },
			id: transformToastId,
		});
		return;
	}

	sound.playSoundIfEnabled.execute('transformationComplete');

	await delivery.deliverTransformationResult.execute({
		text: transformationRun.output,
		toastId: transformToastId,
		initiatedVia,
	});
}
