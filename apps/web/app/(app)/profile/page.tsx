import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Page, PageHeader, Card, CardTitle, Field, Note, Badge } from '@/components/ui';
import { IconReceipt, IconReturn, IconStats } from '@/components/icons';
import { PushEnable } from '@/components/PushEnable';
import { updateSettings } from './actions';
import { BudgetSection } from './BudgetSection';

const AGES: Array<[string, string]> = [['', '—'], ['under_18', 'Under 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'], ['45_54', '45–54'], ['55_plus', '55+'], ['prefer_not', 'Prefer not to say']];
const GENDERS: Array<[string, string]> = [['', '—'], ['woman', 'Woman'], ['man', 'Man'], ['non_binary', 'Non-binary'], ['prefer_not', 'Prefer not to say']];
const DEPTS: Array<[string, string]> = [['', '—'], ['womens', "Women's"], ['mens', "Men's"], ['both', 'Both / unisex'], ['kids', "Kids'"]];

export default async function ProfilePage() {
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const sizes = profile?.sizes ?? {};
  const name = profile?.display_name?.trim() || user.email?.split('@')[0] || 'You';

  return (
    <Page>
      <PageHeader
        eyebrow={user.email ?? ''}
        title={name}
        subtitle={profile?.bio || undefined}
        actions={<div className="flex items-center gap-3">
          {profile?.area && <Badge tone="outline">{profile.area}</Badge>}
          <Badge tone="pine">Invite code {profile?.invite_code ?? '—'}</Badge>
          <span className="h-12 w-12 overflow-hidden rounded-full bg-mist">{profile?.avatar_url && <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />}</span>
        </div>}
      />

      {/* One form, three cards: who you are, what fits you, what helps the image matcher. */}
      <form action={updateSettings} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardTitle hint="Shown to friends">About you</CardTitle>
            <div className="space-y-3">
              <Field label="Display name"><input name="display_name" defaultValue={profile?.display_name ?? ''} className="input" /></Field>
              <Field label="Bio"><input name="bio" maxLength={160} defaultValue={profile?.bio ?? ''} placeholder="A line about you" className="input" /></Field>
              <Field label="Current area" hint="Typed by you, never tracked. Friends in the same area show as near you."><input name="area" maxLength={80} defaultValue={profile?.area ?? ''} placeholder="Cambridge, MA" className="input" /></Field>
            </div>
          </Card>

          <Card>
            <CardTitle hint="So friends can lend you things that fit">Sizes</CardTitle>
            <div className="space-y-3">
              {(['top', 'bottom', 'shoes'] as const).map((k) => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}><input name={`size_${k}`} defaultValue={sizes[k] ?? ''} placeholder={k === 'shoes' ? '8' : 'M'} className="input" /></Field>
              ))}
            </div>
          </Card>

          <Card tone="paper">
            <CardTitle hint="Only used to pick the right product photos">Basics</CardTitle>
            <div className="space-y-3">
              <Field label="Age"><select name="age_range" defaultValue={profile?.age_range ?? ''} className="input">{AGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Gender"><select name="gender" defaultValue={profile?.gender ?? ''} className="input">{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="You usually shop"><select name="shops_department" defaultValue={profile?.shops_department ?? ''} className="input">{DEPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            </div>
            <Note className="mt-3">Never shown to friends. Never used for suggestions.</Note>
          </Card>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn-primary" type="submit">Save profile</button>
          <Note>Friends only ever see what you mark shareable. Never prices, dates or stores.</Note>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <BudgetSection supabase={supabase} userId={user.id} />

        <div className="space-y-4">
          <Card>
            <CardTitle hint="Two kinds, each once: a new clothing charge, a return window at 4 days">Notifications</CardTitle>
            <PushEnable />
          </Card>
          <Card tone="paper">
            <CardTitle>Your records</CardTitle>
            <div className="grid gap-2">
              {[
                ['/statement', 'Monthly statement', IconReceipt],
                ['/returns', 'Returns board', IconReturn],
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
      </div>
    </Page>
  );
}
