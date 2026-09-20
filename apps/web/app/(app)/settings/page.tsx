import { getProfile } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptRule } from '@/components/Receipt';
import { updateSettings } from './actions';

const PERSONAS: Array<[string, string, string]> = [
  ['bestie', 'Bestie', 'Warm, hype, gently talks you down.'],
  ['stylist', 'Stylist', 'Blunt, fashion-literate.'],
  ['cfo', 'CFO', 'Dry, all numbers.'],
];

export default async function SettingsPage() {
  const { profile, user } = await getProfile();
  const sizes = profile?.sizes ?? {};
  return (
    <Receipt className="mx-auto max-w-lg">
      <ReceiptHeader title="Settings" subtitle={user.email ?? ''} />
      <ReceiptRule />
      <form action={updateSettings} className="space-y-5">
        <label className="block">
          <div className="mono text-xs uppercase text-ink-3">Display name</div>
          <input name="display_name" defaultValue={profile?.display_name ?? ''} className="mt-1 w-full border border-rule bg-paper p-2 text-sm" />
        </label>
        <fieldset>
          <legend className="mono text-xs uppercase text-ink-3">Voice persona (spoken statement, optional)</legend>
          <div className="mt-2 space-y-2">
            {PERSONAS.map(([v, label, desc]) => (
              <label key={v} className="flex items-start gap-2 text-sm">
                <input type="radio" name="voice_persona" value={v} defaultChecked={(profile?.voice_persona ?? 'bestie') === v} className="mt-1" />
                <span><span className="font-medium">{label}</span> <span className="text-ink-3">— {desc}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mono text-xs uppercase text-ink-3">Sizes (shown to friends for borrow matching)</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['top', 'bottom', 'shoes'] as const).map((k) => (
              <label key={k} className="block">
                <div className="mono text-[11px] uppercase text-ink-3">{k}</div>
                <input name={`size_${k}`} defaultValue={sizes[k] ?? ''} className="mt-1 w-full border border-rule bg-paper p-2 text-sm" />
              </label>
            ))}
          </div>
        </fieldset>
        <ReceiptRule />
        <div className="mono text-[11px] text-ink-3">
          <div>INVITE CODE · {profile?.invite_code ?? '—'}</div>
          <div className="mt-1">PROFILE BASICS (AGE · GENDER · DEPARTMENT) · <a href="/welcome?edit=1&next=/settings" className="underline">EDIT</a> · USED ONLY FOR IMAGE MATCHING</div>
          <div className="mt-1">PRIVACY · Friends see shareable items only. Prices, purchase dates, stores and return windows are never shared. Intimates are hidden by default.</div>
        </div>
        <button className="btn btn-primary" type="submit">Save</button>
      </form>
    </Receipt>
  );
}
