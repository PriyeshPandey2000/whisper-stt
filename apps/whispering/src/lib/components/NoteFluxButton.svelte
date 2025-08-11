<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Button, type Props } from '$lib/ui/button';
	import { mergeProps } from 'bits-ui';
	import { nanoid } from 'nanoid/non-secure';

	import NoteFluxTooltip from './NoteFluxTooltip.svelte';

	let {
		children,
		id = nanoid(),
		tooltipContent,
		...buttonProps
	}: Props & { id?: string; tooltipContent: Snippet | string } = $props();
</script>

<NoteFluxTooltip {id} {tooltipContent}>
	{#snippet trigger({ tooltip, tooltipProps })}
		<Button {...mergeProps(tooltipProps, buttonProps)}>
			{@render children?.()}
			<span class="sr-only">
				{@render tooltip()}
			</span>
		</Button>
	{/snippet}
</NoteFluxTooltip>
