import { Nav } from '@/components/Nav';
import { PrinterSlot } from '@/components/PrinterSlot';
import { DemoPanel } from '@/components/DemoPanel';
import { getProfile } from '@/lib/auth';
import { isDemoMode } from '@weave/shared/env';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await getProfile();
  const name = profile?.display_name ?? user.email ?? 'you';
  return (
    <div className="min-h-screen">
      <PrinterSlot />
      <DemoPanel />
      <Nav name={name} demo={isDemoMode()} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
