import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import type { Item } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function WardrobePage() {
  const { supabase, user } = await requireUser();
  const [{ data }, admin] = [await supabase.from('items').select('*').eq('user_id', user.id).eq('status', 'owned').order('purchase_date', { ascending: false, nullsFirst: false }), createAdminClient()];
  const items = (data ?? []) as Item[];
  const { data: tok } = admin ? await admin.from('gmail_tokens').select('user_id').eq('user_id', user.id).maybeSingle() : { data: null };
  const hasGmail = !!tok;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <IngestPanel hasGmail={hasGmail} itemCount={0} />
        <Receipt className="mx-auto max-w-lg">
          <ReceiptHeader title="Wardrobe" subtitle="NOTHING PRINTED YET" />
          <ReceiptRule />
          <ReceiptLine label="ITEMS" value="0" muted />
          <ReceiptLine label="PAID IN TOTAL" value="$0.00" muted />
          <ReceiptLine label="CLOSET COVERAGE" value="Not enough purchase history" muted />
        </Receipt>
      </div>
    );
  }

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const withImages = items.filter((i) => i.image_url).length;
  const returnable = items.filter((i) => i.return_by && i.return_by >= new Date().toISOString().slice(0, 10)).length;
  return (
    <div className="space-y-6">
      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />
      <Receipt>
        <ReceiptHeader title="Wardrobe" subtitle={`${items.length} ITEMS`} />
        <ReceiptRule />
        <ReceiptLine label="PAID IN TOTAL" value={usd(paid)} />
        <ReceiptLine label="WITH PRODUCT IMAGE" value={`${withImages} / ${items.length}`} muted />
        <ReceiptLine label="STILL RETURNABLE" value={String(returnable)} muted />
      </Receipt>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((i) => (
          <div key={i.id} className="cutout p-2">
            <div className="aspect-[3/4] w-full bg-paper-2">
              {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center text-[10px] text-ink-3">NO IMAGE</div>}
            </div>
            <div className="mt-2 truncate text-sm" title={i.name}>{i.name}</div>
            <div className="mono flex justify-between text-[11px] text-ink-3"><span className="truncate">{i.brand ?? i.retailer ?? ''}{i.size ? ` · ${i.size}` : ''}</span><span>{usd(i.price_cents)}</span></div>
            <div className="mono flex justify-between text-[10px] text-ink-3"><span>{i.purchase_date ?? ''}</span>{i.return_by && i.return_by >= new Date().toISOString().slice(0, 10) && <span>RETURN BY {i.return_by.slice(5)}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
