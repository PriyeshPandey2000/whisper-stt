<script lang="ts">
	import { ChromeWebStoreIcon } from '$lib/components/icons';
	import NoteFluxButton from '$lib/components/NoteFluxButton.svelte';
	import { Button } from '$lib/ui/button';
	import { Card } from '$lib/ui/card';
	import { CommandIcon, DownloadIcon, MicIcon, ZapIcon } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Download Desktop App - NoteFlux</title>
</svelte:head>

<main
	class="flex flex-1 items-center justify-center p-4 container max-w-4xl mx-auto"
>
	<div class="w-full">
		<header class="text-center space-y-4 mb-8">
			<h1 class="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
				NoteFlux Desktop
			</h1>
			<p class="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto">
				Experience the full power of NoteFlux with native performance and
				system-wide integration.
			</p>
		</header>

		<div class="grid gap-6 mb-8 lg:grid-cols-3">
			<Card class="p-6">
				<div class="space-y-2">
					<CommandIcon class="h-8 w-8 text-primary mb-2" />
					<h3 class="text-lg font-semibold">Global Shortcuts</h3>
					<p class="text-sm text-muted-foreground">
						Customizable global keyboard shortcuts for recording control from
						anywhere on your system
					</p>
				</div>
			</Card>

			<Card class="p-6">
				<div class="space-y-2">
					<MicIcon class="h-8 w-8 text-primary mb-2" />
					<h3 class="text-lg font-semibold">Native Performance</h3>
					<p class="text-sm text-muted-foreground">
						Rust backend, more audio APIs, and optimized resource usage
					</p>
				</div>
			</Card>

			<Card class="p-6">
				<div class="space-y-2">
					<ZapIcon class="h-8 w-8 text-primary mb-2" />
					<h3 class="text-lg font-semibold">System Integration</h3>
					<p class="text-sm text-muted-foreground">
						System tray controls, direct text injection, auto-updates, and
						window management
					</p>
				</div>
			</Card>
		</div>

		<div class="flex flex-col items-center gap-4">
			<div class="flex flex-col gap-3 sm:flex-row">
				<NoteFluxButton
					tooltipContent="Download NoteFlux Desktop App"
					href="https://github.com/PriyeshPandey2000/whisper-stt/releases"
					target="_blank"
					rel="noopener noreferrer"
					variant="default"
					size="lg"
					class="min-w-[200px]"
				>
					<DownloadIcon class="mr-2 size-5" />
					Download for Desktop
				</NoteFluxButton>
				<NoteFluxButton
					tooltipContent="Get the Chrome Extension"
					href="https://chromewebstore.google.com/detail/noteflux/oilbfihknpdbpfkcncojikmooipnlglo"
					target="_blank"
					rel="noopener noreferrer"
					variant="outline"
					size="lg"
				>
					<ChromeWebStoreIcon class="mr-2 size-5" />
					Chrome Extension
				</NoteFluxButton>
			</div>

			<Button onclick={() => window.history.back()} variant="link" class="mt-2">
				Go back
			</Button>
		</div>
	</div>
</main>
