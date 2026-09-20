import type { ReactNode } from 'react';
import { Card, CardTitle, Row } from '@/components/ui';

/** Quiet empty card: a title, a few zeroed rows, and an optional action. */
export function EmptyState({ title, lines, children }: { title: string; lines: Array<[string, string]>; children?: ReactNode }) {
  return (
    <Card className="max-w-xl">
      <CardTitle hint="Nothing here yet">{title}</CardTitle>
      {lines.map(([l, v]) => <Row key={l} label={l} value={v} muted />)}
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}
