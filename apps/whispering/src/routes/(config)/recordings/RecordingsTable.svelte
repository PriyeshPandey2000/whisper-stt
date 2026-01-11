<script lang="ts">
	import { Skeleton } from '$lib/ui/skeleton';
	import * as Table from '$lib/ui/table';
	import { FlexRender } from '@tanstack/svelte-table';
	import type { Table as TanstackTable } from '@tanstack/table-core';

	let {
		table,
		isLoading,
		showHeader = true,
		emptyText = 'No recordings yet. Start recording to add one.',
		skeletonRowCount = 5,
	}: {
		table: TanstackTable<any>;
		isLoading: boolean;
		showHeader?: boolean;
		emptyText?: string;
		skeletonRowCount?: number;
	} = $props();

	const visibleColumnCount = $derived.by(() => {
		const count = table
			.getAllLeafColumns()
			.filter((column) => column.getIsVisible()).length;
		return Math.max(count, 1);
	});
</script>

<div class="rounded-md border">
	<Table.Root>
		{#if showHeader}
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup}
					<Table.Row>
						{#each headerGroup.headers as header}
							<Table.Head colspan={header.colSpan}>
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
		{/if}
		<Table.Body>
			{#if isLoading}
				{#each { length: skeletonRowCount }}
					<Table.Row>
						<Table.Cell colspan={visibleColumnCount}>
							<Skeleton class="h-4 w-full" />
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else if table.getRowModel().rows?.length}
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row>
						{#each row.getVisibleCells() as cell}
							<Table.Cell class={cell.column.columnDef.meta?.cellClassName}>
								<FlexRender
									content={cell.column.columnDef.cell}
									context={cell.getContext()}
								/>
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={visibleColumnCount} class="h-24 text-center">
						{emptyText}
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>




