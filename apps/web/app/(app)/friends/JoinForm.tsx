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
    <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await acceptInviteCode(code); if (r.ok) { setCode(''); setErr(''); printReceipt({ title: 'Friend added', lines: [{ label: 'Code', value: code.toUpperCase() }], ttlMs: 3000 }); router.refresh(); } else setErr(r.error ?? 'failed'); }); }}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Friend's code" className="input input-sm uppercase" maxLength={8} />
      <button className="btn btn-sm" disabled={pending || code.length < 6}>Add</button>
      {err && <span className="text-xs text-warn">{err}</span>}
    </form>
  );
}
