'use client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui';

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
  if (state === 'unsupported') return compact ? null : <div className="text-xs text-ink-3">Push isn’t supported in this browser. On iPhone, add Weave to your home screen first.</div>;
  if (state === 'on') return <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2"><Badge tone="save">Notifications on</Badge><span>New charge · return window · 48h check-in</span></div>;
  if (state === 'denied') return <div className="text-xs text-ink-3">Notifications are blocked in your browser settings.</div>;
  return <button className={`btn ${compact ? 'btn-sm btn-outline' : ''}`} disabled={state === 'busy'} onClick={enable}>{state === 'busy' ? 'Enabling…' : 'Turn on notifications'}</button>;
}
