'use client';
import { useTransition } from 'react';
import { removeItem } from './actions';

/** Delete, with confirmation. Image actions live in ImageOptions. */
export function ItemTools({ itemId, name }: { itemId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn !py-1 !text-[10px] hover:!border-warn hover:!text-warn" disabled={pending} onClick={() => { if (confirm(`Delete "${name}" from your wardrobe? This can't be undone.`)) start(async () => { await removeItem(itemId); }); }}>Delete item</button>
  );
}
