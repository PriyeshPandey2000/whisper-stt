<script lang="ts">
	import { Button } from '$lib/ui/button';
	import Orb from './Orb.svelte';

	type Props = {
		onNext: () => void;
		onSkip: () => void;
	};

	let { onNext, onSkip }: Props = $props();
</script>

<div class="flex flex-col items-center text-center p-8 space-y-8">
	<!-- Animated Orb -->
	<div class="w-32 h-32">
		<Orb hoverIntensity={0.49} rotateOnHover={true} hue={100} forceHoverState={false} />
	</div>

	<!-- Brand and Tagline -->
	<div class="space-y-3">
		<h1 class="text-2xl font-semibold tracking-tight text-white/95">
			Welcome to NoteFlux
		</h1>
		<p class="text-sm text-white/60 max-w-[280px]">
			Turn your voice into clean text anywhere — fast, accurate, effortless.
		</p>
	</div>

	<!-- CTA -->
	<div class="w-full pt-2">
		<Button onclick={onNext} class="w-full h-11 text-base font-medium cursor-pointer">
			Get Started
		</Button>
	</div>
</div>
