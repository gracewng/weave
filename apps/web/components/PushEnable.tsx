'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';

function b64ToU8(b64: string) { const p = '='.repeat((4 - (b64.length % 4)) % 4); const s = (b64 + p).replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(s); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); }

/** Registers the service worker and offers push. Three notification kinds only; never marketing. */
export function PushEnable({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<'unsupported' | 'idle' | 'on' | 'denied' | 'busy'>('idle');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setState('unsupported'); return; }
    navigator.serviceWorker.register('/sw.js').then(async (reg) => { const sub = await reg.pushManager.getSubscription(); setState(sub ? 'on' : Notification.permission === 'denied' ? 'denied' : 'idle'); }).catch(() => setState('unsupported'));
  }, []);
  async function enable() {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); return; }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; if (!key) { setState('unsupported'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      setState(r.ok ? 'on' : 'idle');
    } catch { setState('idle'); }
  }
  if (state === 'unsupported') return compact ? null : <div className="mono text-[10px] text-ink-3">NOT SUPPORTED HERE (IPHONE: ADD TO HOME SCREEN)</div>;
  if (state === 'on') return <div className="mono text-[10px] text-save">NOTIFICATIONS ON</div>;
  if (state === 'denied') return <div className="mono text-[10px] text-ink-3">BLOCKED IN BROWSER</div>;
  return <button className={`btn ${compact ? '!py-1 !text-[10px]' : ''}`} disabled={state === 'busy'} onClick={enable}><Icon name="bell" size={12} className="mr-1" />{state === 'busy' ? 'Enabling…' : 'Notifications'}</button>;
}
