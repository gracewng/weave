'use client';
import { useTransition } from 'react';
import { removeItem } from './actions';
import { Icon } from '@/components/Icon';

/** Delete, with confirmation. Image actions live in ImageOptions. */
export function ItemTools({ itemId, name }: { itemId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn flex items-center gap-1 btn-sm hover:!border-warn hover:!text-warn" disabled={pending} onClick={() => { if (confirm(`Delete "${name}" from your wardrobe? This can't be undone.`)) start(async () => { await removeItem(itemId); }); }}><Icon name="trash" size={12} />Delete</button>
  );
}
