import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Page, PageHeader, Card, CardTitle, Field, Badge } from '@/components/ui';
import { IconReceipt, IconReturn, IconStats } from '@/components/icons';
import { updateSettings } from './actions';
import { BudgetSection } from './BudgetSection';
import { AvatarPicker } from './AvatarPicker';

const AGES: Array<[string, string]> = [['', 'Age'], ['under_18', 'Under 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'], ['45_54', '45–54'], ['55_plus', '55+'], ['prefer_not', 'Prefer not to say']];
const GENDERS: Array<[string, string]> = [['', 'Gender'], ['woman', 'Woman'], ['man', 'Man'], ['non_binary', 'Non-binary'], ['prefer_not', 'Prefer not to say']];
const DEPTS: Array<[string, string]> = [['', 'Shops'], ['womens', "Women's"], ['mens', "Men's"], ['both', 'Both'], ['kids', "Kids'"]];

export default async function ProfilePage() {
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const sizes = profile?.sizes ?? {};
  const name = profile?.display_name?.trim() || user.email?.split('@')[0] || 'You';

  return (
    <Page>
      <PageHeader title="Profile" actions={<Badge tone="pine">Invite code {profile?.invite_code ?? '—'}</Badge>} />

      <form action={updateSettings} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>About you</CardTitle>
            <div className="flex items-start gap-5">
              <AvatarPicker url={profile?.avatar_url ?? null} name={name} />
              <div className="min-w-0 flex-1 space-y-3">
                <input name="display_name" defaultValue={profile?.display_name ?? ''} placeholder="Name" className="input" aria-label="Name" />
                <input name="bio" maxLength={160} defaultValue={profile?.bio ?? ''} placeholder="A line about you" className="input" aria-label="Bio" />
                <input name="area" maxLength={80} defaultValue={profile?.area ?? ''} placeholder="Area, e.g. Cambridge, MA" className="input" aria-label="Area" />
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle hint="Sizes help friends lend; the rest only steers photo matching">Fit</CardTitle>
            <div className="grid grid-cols-3 gap-3">
              {(['top', 'bottom', 'shoes'] as const).map((k) => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}><input name={`size_${k}`} defaultValue={sizes[k] ?? ''} placeholder={k === 'shoes' ? '8' : 'M'} className="input" /></Field>
              ))}
              <select name="age_range" defaultValue={profile?.age_range ?? ''} className="input" aria-label="Age">{AGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <select name="gender" defaultValue={profile?.gender ?? ''} className="input" aria-label="Gender">{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <select name="shops_department" defaultValue={profile?.shops_department ?? ''} className="input" aria-label="Shops">{DEPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
          </Card>
        </div>
        <button className="btn btn-primary !px-8 !py-3 !text-sm" type="submit">Save profile</button>
      </form>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <BudgetSection supabase={supabase} userId={user.id} />
        <Card tone="paper">
          <CardTitle>Records</CardTitle>
          <div className="grid gap-2">
            {[
              ['/statement', 'Statement', IconReceipt],
              ['/returns', 'Returns', IconReturn],
              ['/stats', 'AI spend', IconStats],
            ].map(([href, label, Icon]) => {
              const I = Icon as typeof IconReceipt;
              return (
                <Link key={href as string} href={href as string} className="flex items-center gap-3 rounded-2xl border border-dust px-4 py-3 text-sm transition hover:border-fern hover:bg-mist">
                  <I className="h-5 w-5 text-fern" /><span>{label as string}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </Page>
  );
}
