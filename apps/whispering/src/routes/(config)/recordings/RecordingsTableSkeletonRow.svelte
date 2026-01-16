<script lang="ts">
	import { Skeleton } from '$lib/ui/skeleton';
	import * as Table from '$lib/ui/table';
</script>

<Table.Row>
	<!-- Timestamp column (pl-2 pr-4) -->
	<Table.Cell class="pl-2 pr-4">
		<Skeleton class="h-4 w-32" />
	</Table.Cell>

	<!-- Transcribed text column (min-w-[280px]) -->
	<Table.Cell class="min-w-[280px]">
		<div class="space-y-1.5">
			<Skeleton class="h-3 w-full" />
			<Skeleton class="h-3 w-3/4" />
		</div>
	</Table.Cell>

	<!-- Compact audio column -->
	<Table.Cell>
		<div class="flex items-center gap-1">
			<Skeleton class="size-6 rounded-md" />
			<Skeleton class="h-3 w-10" />
		</div>
	</Table.Cell>

	<!-- Actions column -->
	<Table.Cell>
		<Skeleton class="h-8 w-8 rounded-md" />
	</Table.Cell>
</Table.Row>
