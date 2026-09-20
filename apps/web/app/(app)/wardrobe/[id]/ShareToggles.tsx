'use client';
import { useTransition } from 'react';
import { setSharing } from './actions';

export function ShareToggles({ itemId, shareable, lendable, intimates }: { itemId: string; shareable: boolean; lendable: boolean; intimates: boolean }) {
  const [pending, start] = useTransition();
  if (intimates) return <p className="text-sm text-ink-3">Intimates are never shown to friends.</p>;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
      <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={shareable} disabled={pending} onChange={(e) => start(() => setSharing(itemId, 'shareable', e.target.checked))} /> Friends can see this</label>
      <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={lendable} disabled={pending} onChange={(e) => start(() => setSharing(itemId, 'lendable', e.target.checked))} /> Friends can borrow this</label>
    </div>
  );
}
