import { SearchClient } from './SearchClient';

export const dynamic = 'force-dynamic';

/** Search is the intervention point: owned first, then friends, secondhand, new. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SearchClient initialQ={q} />
    </div>
  );
}
