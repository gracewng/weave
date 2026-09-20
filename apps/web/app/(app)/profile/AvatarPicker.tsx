'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAvatar } from './actions';
import { IconUser } from '@/components/icons';

/** Round profile picture; click to pick a new one. */
export function AvatarPicker({ url, name }: { url: string | null; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <label className="group relative block h-24 w-24 cursor-pointer" title="Change photo">
      <span className="block h-full w-full overflow-hidden rounded-full bg-mist ring-4 ring-paper">
        {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-ink-3"><IconUser className="h-10 w-10" /></span>}
      </span>
      <span className={`absolute inset-0 flex items-center justify-center rounded-full bg-pine/70 text-[10px] font-medium text-white transition ${pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{pending ? 'Saving…' : 'Change'}</span>
      <input type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set('avatar', f); start(async () => { const r = await updateAvatar(fd); setError(r.ok ? null : r.error ?? 'failed'); router.refresh(); }); }} />
      {error && <span className="absolute -bottom-5 left-0 whitespace-nowrap text-[10px] text-warn">{error}</span>}
    </label>
  );
}
