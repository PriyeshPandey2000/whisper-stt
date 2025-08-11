<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';
	import type { DeviceIdentifier } from '$lib/services/types';

	let {
		selected,
		onSelectedChange,
	}: {
		selected: DeviceIdentifier | null;
		onSelectedChange: (selected: DeviceIdentifier | null) => void;
	} = $props();

	const getDevicesQuery = createQuery(rpc.recorder.enumerateDevices.options);

	$effect(() => {
		if (getDevicesQuery.isError) {
			rpc.notify.warning.execute({
				title: 'Error loading devices',
				description: getDevicesQuery.error.message,
			});
		}
	});
</script>

{#if getDevicesQuery.isPending}
	<LabeledSelect
		id="recording-device"
		label="Recording Device"
		placeholder="Loading devices..."
		items={[{ value: '', label: 'Loading devices...' }]}
		selected={''}
		onSelectedChange={() => {}}
		disabled
	/>
{:else if getDevicesQuery.isError}
	<p class="text-sm text-red-500">
		{getDevicesQuery.error.message}
	</p>
{:else}
	{@const items = getDevicesQuery.data.map((device) => ({
		value: device.id,
		label: device.label,
	}))}
	<LabeledSelect
		id="recording-device"
		label="Recording Device"
		{items}
		selected={selected || ''}
		onSelectedChange={(value) => onSelectedChange(value ? value as DeviceIdentifier : null)}
		placeholder="Select a device"
	/>
{/if}
