import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p });

export const IconHome = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
export const IconHanger = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 4a2 2 0 0 1 2 2c0 1.5-2 2-2 4M12 10l9 6v1H3v-1z" /></svg>;
export const IconSearch = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>;
export const IconCard = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M7 15h4" /></svg>;
export const IconEnvelope = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 8l9 6 9-6" /></svg>;
export const IconReturn = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 14l-4-4 4-4" /><path d="M5 10h9a5 5 0 0 1 0 10h-3" /></svg>;
export const IconFriends = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 16c2.5 0 5 1.5 5 3.5" /></svg>;
export const IconGhost = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z" /><path d="M9.5 11h.01M14.5 11h.01" strokeWidth="2.6" /></svg>;
export const IconReceipt = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" /><path d="M9 8h6M9 12h6" /></svg>;
export const IconStats = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 18l5-6 4 3 7-8" /><path d="M4 21h16" /></svg>;
export const IconUser = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" /></svg>;
export const IconCog = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M10.3 3h3.4l.5 2.2 1.6.9 2.1-.8 1.7 3-1.7 1.5v1.8l1.7 1.5-1.7 3-2.1-.8-1.6.9-.5 2.2h-3.4l-.5-2.2-1.6-.9-2.1.8-1.7-3 1.7-1.5v-1.8L4.4 8.3l1.7-3 2.1.8 1.6-.9z" /></svg>;
export const IconBag = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
export const IconCoins = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><ellipse cx="12" cy="6.5" rx="7" ry="2.5" /><path d="M5 6.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" /><path d="M5 11.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" /></svg>;
export const IconSprout = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 21v-8" /><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7zM12 13c0-3-2.5-5-5-5 0 3 2 5 5 5z" /></svg>;
export const IconSignOut = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M15 8l4 4-4 4M9 12h10" /></svg>;
