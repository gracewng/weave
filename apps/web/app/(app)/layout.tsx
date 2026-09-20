import { Nav } from '@/components/Nav';
import { PrinterSlot } from '@/components/PrinterSlot';
import { DemoPanel } from '@/components/DemoPanel';
import { getProfile } from '@/lib/auth';
import { isDemoMode } from '@weave/shared/env';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await getProfile();
  // First sign-in: one short onboarding step, then never again (onboarded_at).
  if (profile && !profile.onboarded_at) redirect('/welcome');
  const name = profile?.display_name ?? user.email ?? 'you';
  return (
    <div className="min-h-screen">
      <PrinterSlot />
      <DemoPanel />
      <Nav name={name} demo={isDemoMode()} avatar={profile?.avatar_url ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
