'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: Array<[string, string]> = [
  ['/wardrobe', 'Wardrobe'], ['/search', 'Search'], ['/charges', 'Charges'], ['/friends', 'Friends'], ['/settings', 'Settings'],
];

export function Nav({ name, demo }: { name: string; demo: boolean }) {
  const path = usePathname();
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/wardrobe" className="mono text-sm font-semibold tracking-[.25em]">WEAVE</Link>
        <nav className="mono flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wider">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={`${path.startsWith(href) ? 'text-ink underline underline-offset-4' : 'text-ink-3 hover:text-ink'}`}>{label}</Link>
          ))}
        </nav>
        <div className="mono ml-auto flex items-center gap-3 text-xs text-ink-3">
          {demo && <span className="border border-warn px-1.5 py-0.5 text-[10px] uppercase text-warn">demo</span>}
          <span>{name}</span>
          <form action="/auth/signout" method="post"><button className="hover:text-ink" type="submit">sign out</button></form>
        </div>
      </div>
    </header>
  );
}
