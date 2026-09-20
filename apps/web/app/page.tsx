import { supabaseConfigured } from '@/lib/env';
import { Canopy } from '@/components/Canopy';
import { LandingFlow } from './LandingFlow';

export default async function Landing({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const signinHref = `/auth/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return (
    <main className="h-dvh w-full overflow-hidden">
      <Canopy />
      <LandingFlow signinHref={signinHref} configured={supabaseConfigured()} error={error ?? null} />
    </main>
  );
}
