import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { summarizeCoverage } from '@weave/shared/coverage';
import type { Transaction } from '@weave/shared/types';
import { ChargeActions } from './ChargeActions';
import { ChargesLive } from './ChargesLive';

export const dynamic = 'force-dynamic';

export default async function ChargesPage() {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: txs }, { data: emailItems }, { data: linked }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('items').select('retailer,purchase_date,receipt_url').eq('user_id', user.id).eq('source', 'email').not('purchase_date', 'is', null),
    admin ? admin.from('plaid_items').select('item_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ]);
  const all = (txs ?? []) as Transaction[];
  const clothing = all.filter((t) => t.is_clothing && t.decision !== 'not_clothes');
  const fresh = clothing.filter((t) => t.match_status === 'unmatched');
  const mystery = clothing.filter((t) => t.match_status === 'mystery');
  const matched = clothing.filter((t) => t.match_status === 'matched' || t.match_status === 'captured');
  const emailOrders = [...new Set(((emailItems ?? []) as Array<{ retailer: string | null; purchase_date: string }>).map((i) => `${i.retailer ?? ''}|${i.purchase_date}`))].map((k) => ({ key: k, date: k.split('|')[1]! }));
  const dates = [...all.map((t) => t.date ?? ''), ...emailOrders.map((e) => e.date)].filter(Boolean).sort();
  const cov = summarizeCoverage({
    periodStart: dates[0] ?? '1970-01-01', periodEnd: dates[dates.length - 1] ?? '2999-12-31',
    transactions: all.map((t) => ({ id: t.id, date: t.date ?? '', isClothing: t.is_clothing, matchStatus: t.match_status, decision: t.decision, hasReceipt: (t.item_ids?.length ?? 0) > 0 })),
    emailOrders,
  });
  const bar = cov.detected ? Math.round((cov.ratio ?? 0) * 40) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Receipt>
        <ReceiptHeader title="Charges" subtitle="THE CARD IS THE SOURCE OF TRUTH" />
        <ReceiptRule />
        <ChargesLive userId={user.id} linked={(linked ?? []).length} />
        <ReceiptRule />
        <ReceiptLine label="NEW CHARGES TO CONFIRM" value={String(fresh.length)} valueClass={fresh.length ? '' : ''} />
        <ReceiptLine label="MYSTERY PURCHASES" value={String(mystery.length)} />
        <ReceiptLine label="MATCHED TO RECEIPTS" value={String(matched.length)} muted />
        <ReceiptRule />
        <ReceiptLine label="CLOSET COVERAGE" value={cov.ratio == null ? 'NOT ENOUGH PURCHASE HISTORY' : `${cov.resolved} OF ${cov.detected} RECORDS RESOLVED = ${Math.round(cov.ratio * 100)}%`} />
        {cov.detected > 0 && (
          <div className="mono mt-1 flex items-end gap-px" aria-hidden>{Array.from({ length: 40 }).map((_, i) => <span key={i} className="inline-block w-1.5" style={{ height: i % 3 === 0 ? 22 : 16, background: i < bar ? 'var(--ink)' : 'transparent', borderBottom: i < bar ? 'none' : '2px solid var(--rule)' }} />)}</div>
        )}
        <div className="mono mt-2 text-[10px] text-ink-3">{cov.detected ? `${dates[0]} → ${dates[dates.length - 1]} · ${cov.unresolved} UNRESOLVED · ${cov.missingReceipts} MISSING RECEIPTS · "NOT CLOTHES" LEAVES THE DENOMINATOR` : 'LINK A CARD OR SCAN YOUR INBOX TO START.'}</div>
      </Receipt>

      {fresh.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">New · one question each</div>
          {fresh.map((t) => (
            <Receipt key={t.id} print>
              <div className="flex items-start justify-between gap-2"><div className="truncate text-sm">{t.merchant}</div><span className="mono text-sm">{usd(t.amount_cents)}</span></div>
              <div className="mono text-[10px] text-ink-3">{t.date} · NO MATCHING RECEIPT EMAIL{t.source === 'mock' ? ' · DEMO CHARGE' : ''}</div>
              <ChargeActions txId={t.id} merchant={t.merchant ?? ''} amountCents={t.amount_cents ?? 0} decision={t.decision} kind="new" />
            </Receipt>
          ))}
        </div>
      )}

      {mystery.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Mystery purchases · what was it?</div>
          {mystery.slice(0, 8).map((t) => (
            <Receipt key={t.id}>
              <div className="flex items-start justify-between gap-2"><div className="truncate text-sm">You spent <span className="mono">{usd(t.amount_cents)}</span> at {t.merchant}</div><span className="mono text-[10px] text-ink-3">{t.date}</span></div>
              <div className="mono text-[10px] text-ink-3">THE ITEM LINE IS BLANK UNTIL YOU FILL IT IN · <span className="opacity-40">▒▒▒▒▒▒▒▒▒▒▒▒</span></div>
              <ChargeActions txId={t.id} merchant={t.merchant ?? ''} amountCents={t.amount_cents ?? 0} decision={t.decision} kind="mystery" />
            </Receipt>
          ))}
          {mystery.length > 8 && <div className="mono text-[10px] text-ink-3">+{mystery.length - 8} MORE</div>}
        </div>
      )}

      {matched.length > 0 && (
        <Receipt>
          <ReceiptHeader title="Matched" subtitle="CHARGE ↔ RECEIPT" />
          <ReceiptRule />
          {matched.slice(0, 12).map((t) => <ReceiptLine key={t.id} label={`${t.date} · ${(t.merchant ?? '').slice(0, 24)}`} value={`${usd(t.amount_cents)} · ${t.match_status === 'captured' ? 'SNAPPED' : `${t.item_ids.length} ITEM${t.item_ids.length === 1 ? '' : 'S'}`}`} muted />)}
        </Receipt>
      )}

      {all.length === 0 && <Receipt><p className="text-sm text-ink-2">Link a card and every clothing charge shows up here. Charges with a matching receipt email resolve on their own; the rest ask one question. <Link href="/wardrobe" className="underline">Wardrobe</Link></p></Receipt>}
    </div>
  );
}
