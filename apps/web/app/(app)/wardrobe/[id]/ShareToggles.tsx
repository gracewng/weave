'use client';
import { useTransition } from 'react';
import { setSharing } from './actions';

export function ShareToggles({ itemId, shareable, lendable, intimates }: { itemId: string; shareable: boolean; lendable: boolean; intimates: boolean }) {
  const [pending, start] = useTransition();
  if (intimates) return <div className="mono text-[11px] text-ink-3">INTIMATES · NEVER SHOWN TO FRIENDS</div>;
  return (
    <div className="mono flex flex-wrap gap-4 text-[11px] uppercase text-ink-3">
      <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={shareable} disabled={pending} onChange={(e) => start(() => setSharing(itemId, 'shareable', e.target.checked))} /> Friends can see this</label>
      <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={lendable} disabled={pending} onChange={(e) => start(() => setSharing(itemId, 'lendable', e.target.checked))} /> Friends can borrow this</label>
    </div>
  );
}
