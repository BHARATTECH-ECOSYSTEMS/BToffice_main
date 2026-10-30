// The researcher screens' top bar (components/AppBar.tsx): two sections, like the BharatTech portal's pill links.
export const NAV_LINKS = [
  { label: 'Studies', href: '/studies' },
  { label: 'Interviews', href: '/dashboard' },
] as const;

export type NavSection = (typeof NAV_LINKS)[number]['label'];

/** The section a page belongs to, so its pill is lit; setting up a study counts as Studies. Null outside both. */
export function activeSection(path: string): NavSection | null {
  const pathname = path.split('?')[0];
  const within = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (within('/studies') || within('/setup')) return 'Studies';
  if (within('/dashboard')) return 'Interviews';
  return null;
}
