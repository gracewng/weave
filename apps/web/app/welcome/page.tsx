import { getProfile } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptRule } from '@/components/Receipt';
import { completeOnboarding } from './actions';

export const dynamic = 'force-dynamic';

const AGES: Array<[string, string]> = [['under_18', 'Under 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'], ['45_54', '45–54'], ['55_plus', '55+'], ['prefer_not', 'Prefer not to say']];
const GENDERS: Array<[string, string]> = [['woman', 'Woman'], ['man', 'Man'], ['non_binary', 'Non-binary'], ['prefer_not', 'Prefer not to say']];
const DEPTS: Array<[string, string]> = [['womens', "Women's"], ['mens', "Men's"], ['both', 'Both / unisex'], ['kids', "Kids'"]];

/** Shown once, on first sign-in (the app layout redirects here until onboarded_at is set). Also reachable from Settings to edit. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; edit?: string }> }) {
  const { next, edit } = await searchParams;
  const { profile } = await getProfile();
  const first = !profile?.onboarded_at;
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Receipt print>
        <ReceiptHeader title={first ? 'Before we start' : 'Profile basics'} subtitle="TAKES 10 SECONDS · SHOWN ONCE" />
        <ReceiptRule />
        <p className="text-sm text-ink-2">Two quick things so the AI picks the <span className="font-medium">right product picture</span> for what you buy, and can flag purchases that might not be yours (gifts, someone else&apos;s order).</p>
        <form action={completeOnboarding} className="mt-4 space-y-4">
          <input type="hidden" name="next" value={next && next.startsWith('/') ? next : '/wardrobe'} />
          <fieldset>
            <legend className="mono text-[10px] uppercase text-ink-3">Age</legend>
            <div className="mt-1 flex flex-wrap gap-2">{AGES.map(([v, l]) => <label key={v} className="cutout cursor-pointer px-2 py-1 text-xs has-[:checked]:border-ink has-[:checked]:bg-paper"><input type="radio" name="age_range" value={v} defaultChecked={profile?.age_range === v} className="sr-only" />{l}</label>)}</div>
          </fieldset>
          <fieldset>
            <legend className="mono text-[10px] uppercase text-ink-3">Gender</legend>
            <div className="mt-1 flex flex-wrap gap-2">{GENDERS.map(([v, l]) => <label key={v} className="cutout cursor-pointer px-2 py-1 text-xs has-[:checked]:border-ink has-[:checked]:bg-paper"><input type="radio" name="gender" value={v} defaultChecked={profile?.gender === v} className="sr-only" />{l}</label>)}</div>
          </fieldset>
          <fieldset>
            <legend className="mono text-[10px] uppercase text-ink-3">You usually shop</legend>
            <div className="mt-1 flex flex-wrap gap-2">{DEPTS.map(([v, l]) => <label key={v} className="cutout cursor-pointer px-2 py-1 text-xs has-[:checked]:border-ink has-[:checked]:bg-paper"><input type="radio" name="shops_department" value={v} defaultChecked={profile?.shops_department === v} className="sr-only" />{l}</label>)}</div>
            <div className="mono mt-1 text-[10px] text-ink-3">THIS IS THE STRONGEST SIGNAL FOR PICKING THE RIGHT PICTURE.</div>
          </fieldset>
          <ReceiptRule />
          <div className="mono text-[10px] text-ink-3">USED ONLY TO MATCH PRODUCT IMAGES AND FLAG MISMATCHES. NEVER SHOWN TO FRIENDS. NEVER USED FOR SUGGESTIONS. EVERY FIELD IS OPTIONAL.</div>
          <button className="btn btn-primary w-full" type="submit">{first ? 'Continue' : edit ? 'Save' : 'Save'}</button>
        </form>
      </Receipt>
    </main>
  );
}
