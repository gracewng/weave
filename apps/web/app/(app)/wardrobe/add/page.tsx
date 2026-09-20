import Link from 'next/link';
import { Page, PageHeader, Card } from '@/components/ui';
import { AddOwnForm } from './AddOwnForm';

export const dynamic = 'force-dynamic';

/** Add something you already own: a photo (camera on phones) or a name, plus whatever details you know. */
export default function AddOwnPage() {
  return (
    <Page className="max-w-2xl">
      <PageHeader eyebrow={<Link href="/wardrobe" className="hover:text-ink">← Wardrobe</Link>} title="Add your own" />
      <Card>
        <AddOwnForm />
      </Card>
    </Page>
  );
}
