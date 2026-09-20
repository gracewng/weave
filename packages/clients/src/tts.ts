/**
 * DEVIN-OWNED. ElevenLabs text-to-speech for the statement / verdict voice personas.
 *
 * Endpoint (verified against elevenlabs.io/docs, 2026-09-20):
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
 *   header xi-api-key, body { text, model_id, voice_settings }
 *
 * Caching: key = sha256(text + voiceId). The store is injected so the web app can back it with Supabase
 * Storage + the `audio_cache` table; without a store the client still works, it just re-synthesizes.
 * `chars` is 0 on a cache hit — that is what the /stats cost panel bills against.
 */
import { createHash } from 'node:crypto';
import type { TtsClient, TtsResult, VoicePersona } from '@weave/shared/contracts';

const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
/** Low-latency model with the best price per character; swap to eleven_multilingual_v2 for quality. */
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2_5';
const OUTPUT_FORMAT = 'mp3_44100_128';
const TIMEOUT_MS = 15_000;

export interface TtsStore {
  /** Public URL for a previously stored hash, or null. */
  get(hash: string): Promise<string | null>;
  /** Persist the audio and return its public URL. */
  put(hash: string, bytes: Uint8Array, chars: number): Promise<string>;
}

export function ttsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

export function voiceId(persona: VoicePersona): string | undefined {
  const byPersona: Record<VoicePersona, string | undefined> = {
    bestie: process.env.ELEVENLABS_VOICE_BESTIE,
    stylist: process.env.ELEVENLABS_VOICE_STYLIST,
    cfo: process.env.ELEVENLABS_VOICE_CFO,
  };
  return byPersona[persona];
}

export function cacheKey(text: string, voice: string): string {
  return createHash('sha256').update(`${text}${voice}`).digest('hex');
}

export function createTtsClient(store?: TtsStore): TtsClient {
  return {
    async speak(text: string, persona: VoicePersona): Promise<TtsResult> {
      const voice = voiceId(persona);
      if (!voice) throw new Error(`No ElevenLabs voice configured for persona "${persona}"`);
      const hash = cacheKey(text, voice);

      const hit = await store?.get(hash);
      if (hit) return { audioUrl: hit, cached: true, chars: 0 };

      const res = await fetch(`${API_URL}/${voice}?output_format=${OUTPUT_FORMAT}`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.4, similarity_boost: 0.8, speed: 1.0 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);

      const bytes = new Uint8Array(await res.arrayBuffer());
      const chars = text.length;
      const audioUrl = store
        ? await store.put(hash, bytes, chars)
        : `data:audio/mpeg;base64,${Buffer.from(bytes).toString('base64')}`;
      return { audioUrl, cached: false, chars };
    },
  };
}
