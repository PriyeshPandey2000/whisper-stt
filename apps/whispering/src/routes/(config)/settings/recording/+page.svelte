<script lang="ts">
  import DesktopOutputFolder from './DesktopOutputFolder.svelte';
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { Separator } from '$lib/ui/separator';
	import {
		BITRATE_OPTIONS,
		RECORDING_MODE_OPTIONS,
	} from '$lib/constants/audio';
	import { settings } from '$lib/stores/settings.svelte';
	import SelectRecordingDevice from './SelectRecordingDevice.svelte';

	const SAMPLE_RATE_OPTIONS = [
		{ value: '16000', label: 'Voice Quality (16kHz): Optimized for speech' },
		{ value: '44100', label: 'Standard Quality (44.1kHz): CD quality' },
		{ value: '48000', label: 'High Quality (48kHz): Professional audio' },
	] as const;

</script>

<svelte:head>
	<title>Recording Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Recording</h3>
		<p class="text-muted-foreground text-sm">
			Configure your Whispering recording preferences.
		</p>
	</div>
	<Separator />

	<LabeledSelect
		id="recording-mode"
		label="Recording Mode"
		items={RECORDING_MODE_OPTIONS}
		selected={settings.value['recording.mode']}
		onSelectedChange={(selected) => {
			settings.updateKey('recording.mode', selected);
		}}
		placeholder="Select a recording mode"
		description={`Choose how you want to activate recording: ${RECORDING_MODE_OPTIONS.map(
			(option) => option.label.toLowerCase(),
		).join(', ')}`}
	/>

	{#if settings.value['recording.mode'] === 'manual' || settings.value['recording.mode'] === 'vad'}
		<SelectRecordingDevice
			selected={settings.value['recording.selectedDeviceId']}
			onSelectedChange={(selected) => {
				settings.updateKey('recording.selectedDeviceId', selected);
			}}
		></SelectRecordingDevice>

		{#if !window.__TAURI_INTERNALS__}
			<!-- Web-specific settings -->
			<LabeledSelect
				id="bit-rate"
				label="Bitrate"
				items={BITRATE_OPTIONS.map((option) => ({
					value: option.value,
					label: option.label,
				}))}
				selected={settings.value['recording.navigator.bitrateKbps']}
				onSelectedChange={(selected) => {
					settings.updateKey('recording.navigator.bitrateKbps', selected);
				}}
				placeholder="Select a bitrate"
				description="The bitrate of the recording. Higher values mean better quality but larger file sizes."
			/>
		{:else}
			<!-- Desktop-specific settings -->
			<LabeledSelect
				id="sample-rate"
				label="Sample Rate"
				items={SAMPLE_RATE_OPTIONS}
				selected={settings.value['recording.desktop.sampleRate']}
				onSelectedChange={(selected) => {
					settings.updateKey('recording.desktop.sampleRate', selected as typeof SAMPLE_RATE_OPTIONS[number]['value']);
				}}
				placeholder="Select sample rate"
				description="Higher sample rates provide better quality but create larger files"
			/>

			<div class="space-y-2">
				<label for="output-folder" class="text-sm font-medium">
					Recording Output Folder
				</label>
				<DesktopOutputFolder></DesktopOutputFolder>
				<p class="text-xs text-muted-foreground">
					Choose where to save your recordings. Default location is secure and managed by the app.
				</p>
			</div>
		{/if}
	{/if}
</div>
