import { getProfile } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptRule } from '@/components/Receipt';
import { updateSettings } from './actions';
import { PushEnable } from '@/components/PushEnable';
import { BudgetSection } from './BudgetSection';
import { createClient } from '@/lib/supabase/server';

const AGES: Array<[string, string]> = [['', '—'], ['under_18', 'Under 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'], ['45_54', '45–54'], ['55_plus', '55+'], ['prefer_not', 'Prefer not to say']];
const GENDERS: Array<[string, string]> = [['', '—'], ['woman', 'Woman'], ['man', 'Man'], ['non_binary', 'Non-binary'], ['prefer_not', 'Prefer not to say']];
const DEPTS: Array<[string, string]> = [['', '—'], ['womens', "Women's"], ['mens', "Men's"], ['both', 'Both / unisex'], ['kids', "Kids'"]];

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
          <input name="display_name" defaultValue={profile?.display_name ?? ''} className="input mt-1 " />
        </label>
        <label className="block">
          <div className="mono text-xs uppercase text-ink-3">Bio</div>
          <input name="bio" maxLength={160} defaultValue={profile?.bio ?? ''} placeholder="a line about you" className="input mt-1 " />
        </label>
        <label className="block">
          <div className="mono text-xs uppercase text-ink-3">Current area</div>
          <input name="area" maxLength={80} defaultValue={profile?.area ?? ''} placeholder="Cambridge, MA" className="input mt-1 " />
          <div className="mono mt-1 text-[10px] text-ink-3">TYPED, NEVER TRACKED. SAME AREA = NEAR YOU.</div>
        </label>
        <fieldset>
          <legend className="mono text-xs uppercase text-ink-3">Sizes (for borrowing)</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['top', 'bottom', 'shoes'] as const).map((k) => (
              <label key={k} className="block">
                <div className="mono text-[11px] uppercase text-ink-3">{k}</div>
                <input name={`size_${k}`} defaultValue={sizes[k] ?? ''} className="input mt-1 " />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mono text-xs uppercase text-ink-3">Profile basics (image matching only)</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="block"><div className="mono text-[11px] uppercase text-ink-3">Age</div><select name="age_range" defaultValue={profile?.age_range ?? ''} className="input mt-1 ">{AGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><div className="mono text-[11px] uppercase text-ink-3">Gender</div><select name="gender" defaultValue={profile?.gender ?? ''} className="input mt-1 ">{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><div className="mono text-[11px] uppercase text-ink-3">Shops</div><select name="shops_department" defaultValue={profile?.shops_department ?? ''} className="input mt-1 ">{DEPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </div>
        </fieldset>
        <ReceiptRule />
        <div className="mono text-[11px] text-ink-3">
          <div>INVITE CODE · {profile?.invite_code ?? '—'}</div>
          <div className="mt-1">FRIENDS NEVER SEE PRICES.</div>
        </div>
        <button className="btn btn-primary" type="submit">Save</button>
      </form>
      <ReceiptRule />
      <div className="mono mb-1 text-xs uppercase text-ink-3">Notifications</div>
      <PushEnable />
      <div className="mono mt-1 text-[10px] text-ink-3">NEW CHARGE · RETURN WINDOW · CHECK-IN. EACH ONCE.</div>
    </Receipt>
  );
}
