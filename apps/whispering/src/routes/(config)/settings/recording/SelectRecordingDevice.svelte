<script lang="ts">
	import type { DeviceIdentifier } from '$lib/services/types';

	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';

	let {
		onSelectedChange,
		selected,
	}: {
		onSelectedChange: (selected: DeviceIdentifier | null) => void;
		selected: DeviceIdentifier | null;
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
		items={[{ label: 'Loading devices...', value: '' }]}
		selected=""
		onSelectedChange={() => {}}
		disabled
	/>
{:else if getDevicesQuery.isError}
	<p class="text-sm text-red-500">
		{getDevicesQuery.error.message}
	</p>
{:else}
	{@const items = getDevicesQuery.data.map((device) => ({
		label: device.label,
		value: device.id,
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
