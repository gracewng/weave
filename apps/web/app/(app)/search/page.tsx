import { SearchClient } from './SearchClient';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; for?: string }> }) {
  const { q = '', for: f } = await searchParams;
  return <SearchClient initialQ={q} initialForOther={f === 'other'} />;
}
