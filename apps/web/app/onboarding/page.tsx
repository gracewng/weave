import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule } from '@/components/Receipt';
import { getMatchingProfile } from '@/lib/auth';
import { completeMatchingProfile } from './actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { matchingProfile } = await getMatchingProfile();
  if (matchingProfile) redirect('/wardrobe');
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <Receipt>
        <ReceiptHeader title="One quick detail" subtitle="FOR BETTER RECEIPT MATCHING" />
        <ReceiptRule />
        <p className="text-sm text-ink-2">This helps Weave choose the most accurate product images from your clothing receipts and flag a line item that may belong to someone else. It is used only for that matching step and is never shared with friends.</p>
        <form action={completeMatchingProfile} className="mt-6 space-y-5">
          <label className="block">
            <span className="mono text-xs uppercase text-ink-3">Age range</span>
            <select name="age_range" required defaultValue="prefer_not_to_say" className="mt-1 w-full border border-rule bg-paper p-2 text-sm">
              <option value="under_18">Under 18</option><option value="18_24">18–24</option><option value="25_34">25–34</option><option value="35_44">35–44</option><option value="45_54">45–54</option><option value="55_64">55–64</option><option value="65_plus">65+</option><option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="block">
            <span className="mono text-xs uppercase text-ink-3">Gender</span>
            <select name="gender" required defaultValue="prefer_not_to_say" className="mt-1 w-full border border-rule bg-paper p-2 text-sm">
              <option value="woman">Woman</option><option value="man">Man</option><option value="non_binary">Non-binary</option><option value="another_identity">Another identity</option><option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="block">
            <span className="mono text-xs uppercase text-ink-3">Departments you usually shop</span>
            <select name="shopping_department" required defaultValue="no_preference" className="mt-1 w-full border border-rule bg-paper p-2 text-sm">
              <option value="womens">Women’s</option><option value="mens">Men’s</option><option value="unisex_or_mixed">Unisex or mixed</option><option value="no_preference">No preference</option>
            </select>
          </label>
          <ReceiptLine label="PRIVACY" value="MATCHING ONLY" muted />
          <button className="btn btn-primary w-full" type="submit">Continue to my wardrobe</button>
        </form>
      </Receipt>
    </main>
  );
}
