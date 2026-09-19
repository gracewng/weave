/** #30wears progress ring. Pure SVG, readable text in the middle. */
export function WearRing({ wears, size = 56 }: { wears: number; size?: number }) {
  const p = Math.min(1, wears / 30);
  const r = (size - 6) / 2; const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${wears} of 30 wears`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p >= 1 ? 'var(--save)' : 'var(--ink)'} strokeWidth="3"
        strokeDasharray={`${c * p} ${c * (1 - p)}`} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-mono)" fontSize={size * 0.24} fill="currentColor">{wears}</text>
      <text x="50%" y="72%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-mono)" fontSize={size * 0.13} fill="var(--ink-3)">/30</text>
    </svg>
  );
}
