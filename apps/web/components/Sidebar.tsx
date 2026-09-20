'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import { Logo } from '@/components/Logo';
import { IconHome, IconHanger, IconBag, IconCard, IconEnvelope, IconFriends, IconCog } from '@/components/icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Entry = { href: string; label: string; icon: Icon } | { group: string; items: Array<{ href: string; label: string; icon: Icon }> };

const NAV: Entry[] = [
  { href: '/home', label: 'Home', icon: IconHome },
  { group: 'Wardrobe', items: [
    { href: '/wardrobe', label: 'My stuff', icon: IconHanger },
    { href: '/search', label: 'Shop', icon: IconBag },
  ] },
  { group: 'Money', items: [
    { href: '/charges', label: 'Spending', icon: IconCard },
    { href: '/budget', label: 'Budgeting', icon: IconEnvelope },
  ] },
  { href: '/friends', label: 'Friends', icon: IconFriends },
  { href: '/settings', label: 'Settings', icon: IconCog },
];

export function Sidebar({ name, demo }: { name: string; demo: boolean }) {
  const path = usePathname();
  const link = (l: { href: string; label: string; icon: Icon }, extra = '') => (
    <Link key={l.href} href={l.href} className={`sidebar-link shrink-0 ${extra} ${path.startsWith(l.href) ? 'active' : ''}`}>
      <l.icon /><span className="hidden sm:inline">{l.label}</span>
    </Link>
  );
  return (
    <aside className="flex shrink-0 flex-col gap-2 border-b border-mist p-3 md:w-56 md:border-b-0 md:border-r md:p-5">
      <div className="hidden items-center justify-between md:flex">
        <Link href="/home"><Logo /></Link>
        {demo && <span className="display rounded-full bg-mist px-2 py-0.5 text-[9px] text-warn">demo</span>}
      </div>
      <nav className="flex gap-1 overflow-x-auto md:mt-4 md:flex-col md:overflow-visible">
        {NAV.map((e, i) => 'group' in e ? (
          <div key={e.group} className="contents md:block md:mt-3">
            <div className="display hidden px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-ink-3 md:block">{e.group}</div>
            {e.items.map((l) => link(l))}
          </div>
        ) : link(e, i > 0 && 'group' in NAV[i - 1]! ? 'md:mt-4' : ''))}
      </nav>
      <div className="mt-auto hidden items-center justify-between gap-2 border-t border-mist pt-4 text-xs text-ink-3 md:flex">
        <span className="truncate">{name}</span>
        <form action="/auth/signout" method="post"><button className="btn-text" type="submit">Sign out</button></form>
      </div>
    </aside>
  );
}
