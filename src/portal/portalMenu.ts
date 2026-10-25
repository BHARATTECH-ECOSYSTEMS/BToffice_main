import type { LinkFx } from '../components/navKeys';
import type { HueName } from '../gl/palette';
import type { PortalIconName } from './data';

export interface MenuLink {
  to: string;
  label: string;
  icon: PortalIconName;
  adminOnly?: boolean;
  /** An external tool's address: the link opens the tool itself, in a new tab. */
  href?: string;
}

/** A top-bar key: either a page, or a menu of pages grouped under small headings. Like the site nav's links, each
 *  key has a colour and its own hover effect. */
type TopKey = { key: string; label: string; tone: HueName; fx: LinkFx; adminOnly?: boolean };
export type TopItem = (TopKey & { to: string }) | (TopKey & { sections: { heading: string; links: MenuLink[] }[] });

export type MenuGroup = { heading: string | null; links: { to: string; label: string; icon?: PortalIconName; href?: string; end: boolean }[] };

/**
 * The phone menu's lists, from the same items as the top bar (already filtered for the person's role): the pages
 * first, in the bar's order, then each menu's sections under "Menu · Section". Empty sections are left out.
 */
export function menuGroups(items: TopItem[]): MenuGroup[] {
  const pages: MenuGroup = { heading: null, links: [] };
  const sections: MenuGroup[] = [];
  for (const item of items) {
    // Overview is the portal's root, so it is current only on the dashboard itself
    if ('to' in item) pages.links.push({ to: item.to, label: item.label, end: item.to === '/portal' });
    else
      for (const s of item.sections) sections.push({ heading: `${item.label} · ${s.heading}`, links: s.links.map((l) => ({ to: l.to, label: l.label, icon: l.icon, href: l.href, end: false })) });
  }
  // a section whose links were all for other roles has none left
  return [pages, ...sections].filter((g) => g.links.length);
}
