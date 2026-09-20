import { redirect } from 'next/navigation';
import { getProfile, isOnboarded } from '@/lib/auth';
import { Canopy } from '@/components/Canopy';
import { WelcomeFlow } from './WelcomeFlow';

export const dynamic = 'force-dynamic';

/* First sign-in: basics → bank link → app. Resumes at the bank step if basics are saved. Settings reaches it with ?edit=1. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; edit?: string }> }) {
  const { next, edit } = await searchParams;
  const { profile, user } = await getProfile();
  if (!edit && isOnboarded(profile)) redirect('/home');
  return (
    <main className="h-dvh w-full overflow-hidden">
      <Canopy seed={11} />
      <WelcomeFlow
        name={profile?.display_name ?? user.email?.split('@')[0] ?? 'there'}
        initial={{ age_range: profile?.age_range ?? null, gender: profile?.gender ?? null, shops_department: profile?.shops_department ?? null }}
        next={next && next.startsWith('/') ? next : '/home'}
        edit={!!edit}
        startAtBank={!edit && !!(profile?.age_range || profile?.gender || profile?.shops_department)}
        demo={process.env.DEMO_MODE === 'true'}
      />
    </main>
  );
}
