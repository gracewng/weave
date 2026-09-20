/**
 * DEVIN-OWNED. Fixture TTS: used when DEMO_MODE=true and whenever the real ElevenLabs call throws.
 * Returns a bundled 0.35s mp3 as a data: URL so the audio element still plays and the cache path is exercised.
 * `chars` reports what the real call would have billed; a repeat of the same (text, voice) reports cached.
 */
import type { TtsClient, VoicePersona } from '@weave/shared/contracts';
import { fixtureLatency } from '@weave/shared/env';
import { cacheKey, voiceId, type TtsStore } from './tts';

/** 0.35s 520Hz tone, mono 22.05kHz — generated with ffmpeg, checked in so the demo needs no network. */
const BEEP_MP3_BASE64 =
  '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' +
  'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

export const FIXTURE_AUDIO_DATA_URL = `data:audio/mpeg;base64,${BEEP_MP3_BASE64}`;

export function createTtsMock(store?: TtsStore): TtsClient {
  const seen = new Set<string>();
  return {
    async speak(text: string, persona: VoicePersona) {
      await fixtureLatency();
      const hash = cacheKey(text, voiceId(persona) ?? `fixture-${persona}`);
      const hit = (await store?.get(hash)) ?? (seen.has(hash) ? FIXTURE_AUDIO_DATA_URL : null);
      if (hit) return { audioUrl: hit, cached: true, chars: 0 };
      seen.add(hash);
      return { audioUrl: FIXTURE_AUDIO_DATA_URL, cached: false, chars: text.length };
    },
  };
}
