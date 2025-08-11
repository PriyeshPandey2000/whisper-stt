import { DeepgramTranscriptionServiceLive } from './deepgram';
import { ElevenlabsTranscriptionServiceLive } from './elevenlabs';
import { GroqTranscriptionServiceLive } from './groq';
import { OpenaiTranscriptionServiceLive } from './openai';
import { SpeachesTranscriptionServiceLive } from './speaches';

export {
	ElevenlabsTranscriptionServiceLive as elevenlabs,
	GroqTranscriptionServiceLive as groq,
	OpenaiTranscriptionServiceLive as openai,
	SpeachesTranscriptionServiceLive as speaches,
	DeepgramTranscriptionServiceLive as deepgram,
};

export type { ElevenLabsTranscriptionService } from './elevenlabs';
export type { GroqTranscriptionService } from './groq';
export type { OpenaiTranscriptionService } from './openai';
export type { SpeachesTranscriptionService } from './speaches';
export type { DeepgramTranscriptionService } from './deepgram';