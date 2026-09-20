'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import { Logo } from '@/components/Logo';
import { IconHome, IconHanger, IconSearch, IconCard, IconFriends, IconCog, IconSignOut } from '@/components/icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Entry = { href: string; label: string; icon: Icon };

/* Five tabs plus Home. Budget, statement, returns and stats live under Profile. */
const NAV: Entry[] = [
  { href: '/home', label: 'Home', icon: IconHome },
  { href: '/wardrobe', label: 'Wardrobe', icon: IconHanger },
  { href: '/search', label: 'Search', icon: IconSearch },
  { href: '/charges', label: 'Charges', icon: IconCard },
  { href: '/friends', label: 'Friends', icon: IconFriends },
  { href: '/profile', label: 'Profile', icon: IconCog },
];

export function Sidebar({ name, demo, avatar }: { name: string; demo: boolean; avatar?: string | null }) {
  const path = usePathname();
  return (
    <aside className="flex shrink-0 flex-col gap-2 border-b border-mist p-3 md:w-56 md:border-b-0 md:border-r md:p-5">
      <div className="hidden items-center justify-between md:flex">
        <Link href="/home"><Logo /></Link>
        {demo && <span className="display rounded-full bg-mist px-2 py-0.5 text-[9px] text-warn">demo</span>}
      </div>
      <nav className="flex gap-1 overflow-x-auto md:mt-4 md:flex-col md:overflow-visible">
        {NAV.map((l) => (
          <Link key={l.href} href={l.href} title={l.label} className={`sidebar-link shrink-0 ${path.startsWith(l.href) ? 'active' : ''}`}>
            <l.icon /><span className="hidden sm:inline">{l.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto hidden items-center justify-between gap-2 border-t border-mist pt-4 text-xs text-ink-3 md:flex">
        <Link href="/profile" className="flex min-w-0 items-center gap-2 hover:text-ink" title={name}>
          <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-mist">{avatar && <img src={avatar} alt="" className="h-full w-full object-cover" />}</span>
          <span className="truncate">{name}</span>
        </Link>
        <form action="/auth/signout" method="post"><button className="btn-icon" type="submit" title="Sign out" aria-label="Sign out"><IconSignOut /></button></form>
      </div>
    </aside>
  );
}
