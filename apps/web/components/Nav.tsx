'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';

const LINKS: Array<[string, string, string]> = [
  ['/wardrobe', 'Wardrobe', 'wardrobe'], ['/search', 'Search', 'search'], ['/charges', 'Charges', 'card'], ['/friends', 'Friends', 'users'], ['/profile', 'Profile', 'user'],
];

export function Nav({ name, demo, avatar }: { name: string; demo: boolean; avatar?: string | null }) {
  const path = usePathname();
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2">
        <Link href="/wardrobe" className="mono text-sm font-semibold tracking-[.25em]">WEAVE</Link>
        <nav className="mono flex flex-1 gap-1 overflow-x-auto text-[11px] uppercase tracking-wider">
          {LINKS.map(([href, label, icon]) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href} title={label} className={`flex items-center gap-1.5 px-2 py-1.5 ${active ? 'border-b-2 border-ink text-ink' : 'text-ink-3 hover:text-ink'}`}>
                <Icon name={icon} size={15} /><span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mono flex items-center gap-2 text-[11px] text-ink-3">
          {demo && <span className="border border-warn px-1.5 py-0.5 text-[10px] uppercase text-warn">demo</span>}
          <Link href="/profile" className="flex items-center gap-1.5 hover:text-ink" title={name}>
            <span className="h-6 w-6 overflow-hidden rounded-full bg-paper-2">{avatar && <img src={avatar} alt="" className="h-full w-full object-cover" />}</span>
          </Link>
          <form action="/auth/signout" method="post"><button className="hover:text-ink" type="submit" title="Sign out" aria-label="Sign out"><Icon name="out" size={15} /></button></form>
        </div>
      </div>
    </header>
  );
}
