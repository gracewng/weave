import { Nav } from '@/components/Nav';
import { getProfile } from '@/lib/auth';
import { isDemoMode } from '@weave/shared/env';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await getProfile();
  const name = profile?.display_name ?? user.email ?? 'you';
  return (
    <div className="min-h-screen">
      <Nav name={name} demo={isDemoMode()} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
