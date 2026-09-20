/* Route-group loading state: the page's shape in soft tiles. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2"><div className="h-4 w-24 rounded-full bg-mist" /><div className="h-8 w-56 rounded-full bg-mist" /></div>
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-3xl bg-mist" />)}</div>
      <div className="h-56 rounded-3xl bg-mist" />
    </div>
  );
}
