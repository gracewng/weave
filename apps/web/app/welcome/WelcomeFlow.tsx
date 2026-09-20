'use client';
import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { Stage } from '@/components/onboarding/Stage';
import type { Block } from '@/components/three/receiptTexture';
import { openPlaidLink, linkTestBank } from '@/lib/plaid-link';
import { completeOnboarding, finishOnboarding, saveBasics } from './actions';

const ReceiptPrinter3D = dynamic(() => import('@/components/three/ReceiptPrinter3D').then((m) => m.ReceiptPrinter3D), { ssr: false });

type Key = 'age_range' | 'gender' | 'shops_department';
type Answers = Record<Key, string | null>;
const STEPS: Array<{ key: Key; q: string; label: string; opts: Array<[string, string]> }> = [
  { key: 'age_range', q: 'How old are you?', label: 'Age', opts: [['under_18', 'Under 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'], ['45_54', '45–54'], ['55_plus', '55+'], ['prefer_not', 'Rather not say']] },
  { key: 'gender', q: 'How do you identify?', label: 'Gender', opts: [['woman', 'Woman'], ['man', 'Man'], ['non_binary', 'Non-binary'], ['prefer_not', 'Rather not say']] },
  { key: 'shops_department', q: 'Where do you usually shop?', label: 'Shops', opts: [['womens', "Women's"], ['mens', "Men's"], ['both', 'Both'], ['kids', "Kids'"]] },
];
const CHIP_SPACE = 420;
const LINE_H = 46; // one 'line' block, so an answered section keeps its length
const BANK = STEPS.length + 1;
const DONE = STEPS.length + 2;
const DONE_MS = 5000;

function question(i: number, answer?: string | null): Block[] {
  const s = STEPS[i]!;
  const head: Block[] = [{ t: 'sub', text: `${i + 1} of ${STEPS.length}` }, { t: 'title', text: s.q }];
  if (answer === undefined) return [...head, { t: 'space', h: CHIP_SPACE }];
  const label = s.opts.find(([v]) => v === answer)?.[1] ?? 'skipped';
  return [...head, { t: 'line', label: s.label, value: label, muted: !answer }, { t: 'space', h: CHIP_SPACE - LINE_H }];
}

function bank(outcome?: string): Block[] {
  const head: Block[] = [
    { t: 'title', text: 'Track card spending too?' },
    { t: 'text', text: 'Link a card to catch clothes bought outside your inbox.' },
    { t: 'rule' }, { t: 'line', label: 'Provider', value: 'Plaid' }, { t: 'line', label: 'Access', value: 'transactions only' }, { t: 'rule' },
  ];
  return outcome ? [...head, { t: 'line', label: 'Card', value: outcome }, { t: 'space', h: 60 }] : [...head, { t: 'space', h: 240 }];
}

export function WelcomeFlow({ name, initial, next, edit, startAtBank, demo }: { name: string; initial: Answers; next: string; edit: boolean; startAtBank: boolean; demo: boolean }) {
  const [step, setStep] = useState(startAtBank ? BANK : edit ? 1 : 0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [bankOutcome, setBankOutcome] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const s = STEPS[step - 1];

  function form(a: Answers) {
    const fd = new FormData();
    fd.set('next', next);
    (Object.keys(a) as Key[]).forEach((k) => { if (a[k]) fd.set(k, a[k]!); });
    return fd;
  }
  function pick(key: Key, v: string | null) {
    const a = { ...answers, [key]: v };
    setAnswers(a);
    setTimeout(() => {
      if (step < STEPS.length) return setStep(step + 1);
      if (edit) return start(() => completeOnboarding(form(a)));
      setStep(BANK); start(() => saveBasics(form(a)));
    }, 180);
  }
  function finish(outcome: string) {
    setBankOutcome(outcome); setStep(DONE);
    setTimeout(() => start(() => finishOnboarding()), DONE_MS); // let "All set" sit before redirecting
  }
  const connect = (fn: () => Promise<{ added: number; clothing: number } | null>) => start(async () => {
    setErr('');
    try { const r = await fn(); if (r) finish(`linked · ${r.clothing} clothing charges`); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not connect'); }
  });

  const sections = useMemo<Block[][]>(() => {
    const out: Block[][] = [];
    if (!edit && !startAtBank) out.push([
      { t: 'logo' }, { t: 'title', text: `Hi, ${name}` },
      { t: 'text', text: 'Three quick taps so we pick the right product photos.' },
      { t: 'rule' }, { t: 'line', label: 'Shown to friends', value: 'never', muted: true }, { t: 'line', label: 'Used for suggestions', value: 'never', muted: true },
      { t: 'rule' }, { t: 'space', h: 200 },
    ]);
    if (!startAtBank) for (let i = 0; i < Math.min(step, STEPS.length); i++) out.push(question(i, i < step - 1 || step > STEPS.length ? answers[STEPS[i]!.key] : undefined));
    if (step >= BANK) out.push(bank(step === DONE ? bankOutcome ?? undefined : undefined));
    if (step === DONE) out.push([{ t: 'title', text: 'All set' }, { t: 'text', text: 'Taking you to your closet in a few seconds…' }, { t: 'space', h: 40 }]);
    return out;
  }, [step, name, edit, startAtBank, answers, bankOutcome]);

  const overlay = (
    <Stage id={String(step)}>
      {step === 0 && <button className="btn btn-ink mx-auto !flex w-fit !px-8" onClick={() => setStep(1)}>Let's go</button>}
      {s && (
        <div>
          <div className="flex flex-wrap justify-center gap-2">
            {s.opts.map(([v, l]) => <button key={v} type="button" className="chip" data-on={answers[s.key] === v} onClick={() => pick(s.key, v)}>{l}</button>)}
          </div>
          <div className="mt-4 text-center">
            <button className="btn-text" onClick={() => pick(s.key, null)} disabled={pending}>{step === STEPS.length && edit ? 'Save' : 'Skip'}</button>
          </div>
        </div>
      )}
      {step === BANK && (
        <div className="space-y-2 text-center">
          <button className="btn btn-ink mx-auto !flex w-fit !px-8" disabled={pending} onClick={() => connect(openPlaidLink)}>Connect with Plaid</button>
          {demo && <button className="btn-text" disabled={pending} onClick={() => connect(linkTestBank)}>Use test bank (demo)</button>}
          {err && <div className="mono text-xs text-warn">{err}</div>}
          <div><button className="btn-text" disabled={pending} onClick={() => finish('skipped')}>Skip for now</button></div>
        </div>
      )}
    </Stage>
  );

  return <ReceiptPrinter3D sections={sections} duration={step === 0 ? 1.4 : 0.8} overlay={step === DONE ? undefined : overlay} />;
}
