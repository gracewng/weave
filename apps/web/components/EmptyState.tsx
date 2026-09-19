import type { ReactNode } from 'react';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule } from '@/components/Receipt';

export function EmptyState({ title, lines, children }: { title: string; lines: Array<[string, string]>; children?: ReactNode }) {
  return (
    <Receipt className="mx-auto max-w-lg">
      <ReceiptHeader title={title} subtitle="NOTHING PRINTED YET" />
      <ReceiptRule />
      {lines.map(([l, v]) => <ReceiptLine key={l} label={l} value={v} muted />)}
      <ReceiptRule />
      {children}
    </Receipt>
  );
}
