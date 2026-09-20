'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInviteCode } from './actions';
import { printReceipt } from '@/lib/printer';

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await acceptInviteCode(code); if (r.ok) { setCode(''); setErr(''); printReceipt({ title: 'Friend added', lines: [{ label: 'CODE', value: code.toUpperCase() }], ttlMs: 3000 }); router.refresh(); } else setErr(r.error ?? 'failed'); }); }}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="friend's code" className="mono w-full border border-rule bg-paper p-1.5 text-xs uppercase" maxLength={8} />
      <button className="btn !py-1 !text-[10px]" disabled={pending || code.length < 6}>Add</button>
      {err && <span className="mono text-[10px] text-warn">{err}</span>}
    </form>
  );
}
