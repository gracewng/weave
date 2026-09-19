/** Runtime flags shared by web + extension server code. Keep this file dependency-free. */

export function isDemoMode(): boolean {
  const v = process.env.DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE ?? 'false';
  return v === 'true' || v === '1';
}

export function llmTimeoutMs(): number {
  const n = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

/** Simulated network latency for fixtures so the demo feels real (300–800ms). */
export function fixtureLatency(min = 300, max = 800): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, ms));
}
