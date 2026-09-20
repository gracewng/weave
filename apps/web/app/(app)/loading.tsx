/** Route-group loading state: the printer is working. Covers every page under (app). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-lg" aria-busy="true" aria-live="polite">
      <section className="receipt print">
        <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">WEAVE</div>
        <div className="mono mt-1 text-center text-xs uppercase text-ink-3">Printing…</div>
        <div className="rule-dashed my-3" />
        {[72, 48, 64, 40, 56].map((w, i) => (
          <div key={i} className="leader text-[13px] text-ink-3"><span className="l inline-block h-3 bg-paper" style={{ width: `${w}%` }} /><span className="dots" /><span className="v inline-block h-3 w-10 bg-paper" /></div>
        ))}
      </section>
    </div>
  );
}
