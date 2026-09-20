import { getProfile } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptRule } from '@/components/Receipt';
import { updateSettings } from './actions';
import { PushEnable } from '@/components/PushEnable';
import { BudgetSection } from './BudgetSection';
import { createClient } from '@/lib/supabase/server';

const PERSONAS: Array<[string, string, string]> = [
  ['bestie', 'Bestie', 'Warm, hype, gently talks you down.'],
  ['stylist', 'Stylist', 'Blunt, fashion-literate.'],
  ['cfo', 'CFO', 'Dry, all numbers.'],
];

export default async function SettingsPage() {
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const sizes = profile?.sizes ?? {};
  return (
    <Receipt className="mx-auto max-w-lg">
      <ReceiptHeader title="Profile" subtitle={user.email ?? ''} />
      <ReceiptRule />
      <BudgetSection supabase={supabase} userId={user.id} />
      <ReceiptRule />
      <form action={updateSettings} className="space-y-5">
        <label className="block">
          <div className="mono text-xs uppercase text-ink-3">Display name</div>
          <input name="display_name" defaultValue={profile?.display_name ?? ''} className="mt-1 w-full border border-rule bg-paper p-2 text-sm" />
        </label>
        <fieldset>
          <legend className="mono text-xs uppercase text-ink-3">Voice (optional)</legend>
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
          <legend className="mono text-xs uppercase text-ink-3">Sizes (for borrowing)</legend>
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
          <div className="mt-1">PROFILE BASICS · <a href="/welcome?edit=1&next=/profile" className="underline">EDIT</a> · IMAGE MATCHING ONLY</div>
          <div className="mt-1">FRIENDS NEVER SEE PRICES, DATES OR STORES.</div>
        </div>
        <button className="btn btn-primary" type="submit">Save</button>
      </form>
      <ReceiptRule />
      <div className="mono mb-1 text-xs uppercase text-ink-3">Notifications</div>
      <PushEnable />
      <div className="mono mt-1 text-[10px] text-ink-3">NEW CHARGE · RETURN WINDOW · 48H CHECK-IN. EACH ONCE.</div>
    </Receipt>
  );
}
