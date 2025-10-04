<script lang="ts">
	import { ChromeWebStoreIcon } from '$lib/components/icons';
	import NoteFluxButton from '$lib/components/NoteFluxButton.svelte';
	import { Button } from '$lib/ui/button';
	import { LaptopIcon as DesktopIcon } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Change Global Keyboard Shortcut</title>
</svelte:head>

<main class="flex flex-1 items-center justify-center">
	<section class="container flex flex-col items-center gap-4 text-center">
		<h1 class="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
			Change Your Global Keyboard Shortcut
		</h1>
		<p class="text-muted-foreground lg:text-xl">
			You can access global keyboard shortcuts on the extension and desktop app.
		</p>
		<div class="flex flex-col gap-2 md:flex-row">
			<NoteFluxButton
				tooltipContent="Check out the Chrome Extension"
				href="https://github.com/PriyeshPandey2000/whisper-stt/releases"
				target="_blank"
				rel="noopener noreferrer"
				variant="default"
				size="lg"
			>
				<DesktopIcon class="mr-2 size-6" />
				Download for Desktop
			</NoteFluxButton>
			<NoteFluxButton
				tooltipContent="Check out the desktop app"
				href="https://chromewebstore.google.com/detail/noteflux/oilbfihknpdbpfkcncojikmooipnlglo"
				target="_blank"
				rel="noopener noreferrer"
				variant="outline"
				size="lg"
			>
				<ChromeWebStoreIcon class="mr-2 size-6" />
				Get Chrome Extension
			</NoteFluxButton>
		</div>
		<Button onclick={() => window.history.back()} variant="link">Go back</Button
		>
	</section>
</main>
