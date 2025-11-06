import { rpc } from '$lib/query';
import { generateDefaultTransformationStep } from '$lib/services/db';
import { settings } from '$lib/stores/settings.svelte';
import { nanoid } from 'nanoid/non-secure';

/**
 * Creates a default text formatting transformation for new users if they don't have one already.
 * This provides a working transformation out of the box.
 */
export async function setupDefaultTransformation() {
	try {
		// Check if user already has a selected transformation
		const selectedTransformationId = settings.value['transformations.selectedTransformationId'];
		if (selectedTransformationId) {
			// User already has a transformation selected, assume it exists
			return;
		}

		// Simple check - if we can't access RPC easily, just proceed with creation
		// This is safer than complex RPC checking that might fail
	} catch (error) {
		console.warn('Error checking existing transformations, skipping default setup:', error);
		return;
	}

	// Create default transformation
	const now = new Date().toISOString();
	const defaultStep = generateDefaultTransformationStep();
	
	const defaultTransformation = {
		id: nanoid(),
		title: 'Text Formatter',
		description: 'Clean up transcribed text for clarity and readability',
		createdAt: now,
		updatedAt: now,
		steps: [{
			...defaultStep,
			'prompt_transform.inference.provider': 'Groq' as const,
			'prompt_transform.inference.provider.Groq.model': 'llama-3.1-8b-instant' as const,
			'prompt_transform.systemPromptTemplate': `You are a text formatter. Your ONLY job is to clean up transcribed text and output the cleaned version.

CRITICAL RULES:
- NEVER add commentary, explanations, or meta-responses
- NEVER say things like "It seems you didn't provide text" or "There's an issue here"
- NEVER ask questions or request clarification
- If the input is unclear, just format what's there
- If the input seems incomplete, format what you have
- ALWAYS output something, even if it's just the original text cleaned up

FORMATTING RULES:
- Clean up the text for clarity and natural flow while preserving meaning and the original tone
- Use informal, plain language unless the text clearly uses a professional tone; in that case, match it
- Fix obvious grammar, remove fillers and stutters, collapse repetitions, and keep names and numbers
- Automatically detect and format lists properly: if the text mentions a number (e.g., "3 things", "5 items"), uses ordinal words (first, second, third), implies sequence or steps, or has a count before it, format as an ordered list; otherwise, format as an unordered list
- Write numbers as numerals (e.g., 'five' → '5', 'twenty dollars' → '$20')
- Keep the original intent and nuance
- Organize into short paragraphs of 2–4 sentences for readability

OUTPUT ONLY THE CLEANED TEXT. NO COMMENTARY EVER.`,
			'prompt_transform.userPromptTemplate': 'Here is the text to format:\n{{input}}'
		}]
	};

	// Create the transformation
	try {
		if (typeof rpc.transformations?.mutations?.createTransformation?.execute !== 'function') {
			console.log('RPC transformations mutations not ready, skipping default transformation creation');
			return;
		}
		
		const { data: createdTransformation, error: createError } = await rpc.transformations.mutations.createTransformation.execute(defaultTransformation);
		
		if (createError || !createdTransformation) {
			console.warn('Failed to create default transformation:', createError);
			return;
		}

		// Set it as the selected transformation
		settings.updateKey('transformations.selectedTransformationId', createdTransformation.id);
	} catch (error) {
		console.warn('Error creating default transformation:', error);
	}
}