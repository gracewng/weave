import { getProfile } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, Field, Note } from '@/components/ui';
import { updateSettings } from './actions';
import { PushEnable } from '@/components/PushEnable';

const PERSONAS: Array<[string, string, string]> = [
  ['bestie', 'Bestie', 'Warm, hype, gently talks you down.'],
  ['stylist', 'Stylist', 'Blunt, fashion-literate.'],
  ['cfo', 'CFO', 'Dry, all numbers.'],
];

export default async function SettingsPage() {
  const { profile, user } = await getProfile();
  const sizes = profile?.sizes ?? {};
  return (
    <Page>
      <PageHeader title="Settings" subtitle={user.email ?? ''} />
      <form action={updateSettings} className="max-w-2xl space-y-4">
        <Card>
          <CardTitle hint={`Invite code ${profile?.invite_code ?? '—'}`}>Profile</CardTitle>
          <Field label="Display name"><input name="display_name" defaultValue={profile?.display_name ?? ''} className="input" /></Field>
          <div className="mt-4">
            <div className="mb-1 text-xs font-medium text-ink-2">Sizes <span className="font-normal text-ink-3">· shown to friends for borrow matching</span></div>
            <div className="grid grid-cols-3 gap-3">
              {(['top', 'bottom', 'shoes'] as const).map((k) => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}><input name={`size_${k}`} defaultValue={sizes[k] ?? ''} className="input" /></Field>
              ))}
            </div>
          </div>
          <Note className="mt-4">Profile basics (age, gender, department) are used only for image matching. <a href="/welcome?edit=1&next=/settings" className="underline">Edit</a></Note>
        </Card>
        <Card>
          <CardTitle hint="Spoken statement, optional">Voice persona</CardTitle>
          <div className="space-y-2">
            {PERSONAS.map(([v, label, desc]) => (
              <label key={v} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-paper p-3 text-sm">
                <input type="radio" name="voice_persona" value={v} defaultChecked={(profile?.voice_persona ?? 'bestie') === v} className="mt-0.5" />
                <span><span className="font-medium">{label}</span> <span className="text-ink-3">· {desc}</span></span>
              </label>
            ))}
          </div>
        </Card>
        <Card tone="paper">
          <CardTitle>Privacy</CardTitle>
          <Note>Friends see shareable items only. Prices, purchase dates, stores and return windows are never shared. Intimates are hidden by default. Emails are read-only and their text is never stored.</Note>
        </Card>
        <button className="btn btn-primary" type="submit">Save</button>
      </form>
      <Card className="max-w-2xl">
        <CardTitle>Notifications</CardTitle>
        <PushEnable />
        <Note className="mt-3">Exactly three kinds, each once: a new clothing charge, a return window at 4 days, a 48h hold check-in. Never marketing.</Note>
      </Card>
    </Page>
  );
}
