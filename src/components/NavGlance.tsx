import { Link } from 'react-router';
import {
  Eye,
  Hammer,
  ShieldCheck,
  Sparkles,
  Network,
  Cpu,
  MapPinned,
  Shield,
  Smartphone,
  Brain,
  RefreshCw,
  Users,
  Lock,
  MapPin,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { CAPABILITY_GROUPS, CAPABILITIES, DOMAINS, PRINCIPLES, ROLES, POSTS } from '../content';
import { Cover } from './Cover';

/**
 * A glance at a page from the nav (after the Demaze menus): hovering a link opens a glass panel under the capsule
 * with a few real things from that page on the left and a way into it on the right.
 */

export type GlanceKey = 'about' | 'capabilities' | 'research' | 'careers' | 'publications';

const GROUP_ICONS: LucideIcon[] = [Eye, Hammer, ShieldCheck];
const GROUP_LINES = ['Language, vision, sound and the open web.', 'Agents, workflows, studios and APIs.', 'Workspaces, security and a marketplace.'];
const DOMAIN_ICONS: LucideIcon[] = [Sparkles, Network, Cpu, MapPinned, Shield, Smartphone];
const PRINCIPLE_ICONS: LucideIcon[] = [Brain, RefreshCw, Users, Lock];

function Tile({ icon: Icon, title, body, to, section, onGo }: { icon: LucideIcon; title: string; body: string; to: string; section?: string; onGo: () => void }) {
  return (
    <Link className="glance-tile" to={to} data-section={section} onClick={onGo}>
      <span className="glance-ico">
        <Icon strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span>
        <b>{title}</b>
        <small>{body}</small>
      </span>
    </Link>
  );
}

function Side({ title, body, cta, to, section, onGo }: { title: string; body: string; cta: string; to: string; section?: string; onGo: () => void }) {
  return (
    <div className="glance-side">
      <p>
        <b>{title}</b>
        {body}
      </p>
      <Link className="glance-link" to={to} data-section={section} onClick={onGo}>
        {cta} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function NavGlance({ which, open, onGo, onCapabilities }: { which: GlanceKey | null; open: boolean; onGo: () => void; onCapabilities: () => void }) {
  const body = (() => {
    switch (which) {
      case 'about':
        return (
          <>
            <div className="glance-grid">
              {PRINCIPLES.slice(0, 4).map((p, i) => (
                <Tile key={p.title} icon={PRINCIPLE_ICONS[i]} title={p.title.replace('Intelligence should ', 'Should ')} body={p.body} to="/about" onGo={onGo} />
              ))}
            </div>
            <Side title="An Indian deep-tech lab" body="Building the operating system for intelligence: one layer that remembers, reasons and keeps learning." cta="About Origin" to="/about" onGo={onGo} />
          </>
        );
      case 'capabilities':
        return (
          <>
            <div className="glance-grid is-3">
              {CAPABILITY_GROUPS.map((g, i) => (
                <button key={g} type="button" className="glance-tile is-col" onClick={onCapabilities}>
                  <span className="glance-ico" data-tier={i}>
                    {(() => {
                      const I = GROUP_ICONS[i];
                      return <I strokeWidth={1.75} aria-hidden="true" />;
                    })()}
                  </span>
                  <span>
                    <b>{g}</b>
                    <small>{GROUP_LINES[i]}</small>
                    <em>{CAPABILITIES.slice(i * 5, i * 5 + 3).map((c) => c.name).join(' · ')}</em>
                  </span>
                </button>
              ))}
            </div>
          </>
        );
      case 'research':
        return (
          <>
            <div className="glance-grid">
              {DOMAINS.map((d, i) => (
                <Tile key={d.id} icon={DOMAIN_ICONS[i]} title={d.name} body={d.field} to="/research" onGo={onGo} />
              ))}
            </div>
            <Side title="Six domains, one programme" body="Every domain feeds what it learns back into the same intelligence." cta="Enter the lab" to="/research" onGo={onGo} />
          </>
        );
      case 'careers':
        return (
          <>
            <div className="glance-roles">
              {ROLES.slice(0, 4).map((r) => (
                <Link key={r.title} className="glance-role" to="/careers" onClick={onGo}>
                  <span>
                    <b>{r.title}</b>
                    <small>{r.focus}</small>
                  </span>
                  <span className="glance-where">
                    <MapPin size={12} strokeWidth={2} aria-hidden="true" /> {r.location}
                  </span>
                </Link>
              ))}
            </div>
            <Side title={`${ROLES.length} open roles`} body="Research, engineering and operations, in India and remote." cta="See every role" to="/careers" onGo={onGo} />
          </>
        );
      case 'publications':
        return (
          <>
            <div className="glance-grid is-3">
              {POSTS.slice(0, 3).map((p, i) => (
                <Link key={p.slug} className="glance-post" to={`/publications/${p.slug}`} onClick={onGo}>
                  <span className="glance-shot">
                    <Cover seed={p.slug} variant={i} />
                  </span>
                  <small>
                    {p.category} · {p.read}
                  </small>
                  <b>{p.title}</b>
                </Link>
              ))}
            </div>
            <Side title="Publications" body="Essays and research notes on memory, reasoning and the architecture of intelligence." cta="All publications" to="/publications" onGo={onGo} />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <div className={`glance ${open && which ? 'is-open' : ''} ${which === 'capabilities' ? 'is-wide-grid' : ''}`} data-which={which ?? ''} aria-hidden={!open}>
      <div className="glance-body" key={which ?? 'none'}>
        {body}
      </div>
    </div>
  );
}
