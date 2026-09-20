import { Sidebar } from '@/components/Sidebar';
import { Canopy } from '@/components/Canopy';
import { Snackbar } from '@/components/Snackbar';
import { DemoPanel } from '@/components/DemoPanel';
import { getProfile, isOnboarded } from '@/lib/auth';
import { isDemoMode } from '@weave/shared/env';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await getProfile();
  if (!isOnboarded(profile)) redirect('/welcome');
  const name = profile?.display_name?.trim().split(/\s+/)[0] || user.email?.split('@')[0] || 'you';
  return (
    <div className="min-h-dvh p-3 md:px-0 md:py-[7.5dvh]">
      <Canopy />
      <Snackbar />
      <DemoPanel />
      <div className="panel">
        <Sidebar name={name} demo={isDemoMode()} avatar={profile?.avatar_url ?? null} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
      </div>
    </div>
  );
}
