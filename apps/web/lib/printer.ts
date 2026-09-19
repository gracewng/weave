'use client';
/** Tiny client-side event bus: any component can print a receipt from the slot at the top of the page. */
export interface PrintedLine { label: string; value: string; saved?: boolean; muted?: boolean }
export interface PrintJob { title: string; subtitle?: string; lines: PrintedLine[]; footer?: string; ttlMs?: number }

const EVENT = 'weave:print';
export function printReceipt(job: PrintJob) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PrintJob>(EVENT, { detail: job }));
}
export function onPrint(handler: (job: PrintJob) => void): () => void {
  const h = (e: Event) => handler((e as CustomEvent<PrintJob>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
