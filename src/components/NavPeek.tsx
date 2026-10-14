import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Arrow, toneStyle } from './ui';
import { Cover, DomainArt, MetricsArt, SearchArt, WorkflowArt } from './art';
import { Icon, type IconName } from './fx';
import { AWARDS, CAPABILITIES, CAPABILITY_GROUPS, DOMAINS, EMAIL, HQ, POSTS, PRINCIPLES, PRIVACY_EMAIL, ROLES } from '../content';
import type { HueName } from '../gl/palette';

export type PeekId = 'research' | 'capabilities' | 'services' | 'careers' | 'about' | 'contact';
export const PEEK_ORDER: PeekId[] = ['research', 'services', 'capabilities', 'careers', 'about', 'contact'];

const DOMAIN_TONES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];
const FAMILY_TONES: HueName[] = ['violet', 'tangerine', 'saffron'];
const FAMILY_ART = [SearchArt, WorkflowArt, MetricsArt];
const DEPT_TONE: Record<string, HueName> = { Research: 'violet', Engineering: 'saffron', Operations: 'tangerine' };

/**
 * The glance under the nav. One panel serves every section: its height follows the open pane, each section
 * plays its own entrance whenever it becomes the open one (styles in story.css), and a caret tracks the link.
 */
export function NavPeek({
  peek,
  caret,
  onEnter,
  onLeave,
  onGo,
}: {
  peek: PeekId | null;
  caret: number;
  onEnter: () => void;
  onLeave: () => void;
  onGo: (to: string, section?: string) => void;
}) {
  const panes = useRef<Partial<Record<PeekId, HTMLDivElement | null>>>({});
  const [h, setH] = useState(0);
  const [last, setLast] = useState<PeekId>('research');
  const [left, setLeft] = useState(0);
  // counts each time a section is shown (on open and on every switch), so its drawings replay with its entrance
  const [epoch, setEpoch] = useState(0);
  // the showing each pane was last mounted for; a pane leaving keeps its key so it doesn't remount as it goes
  const mountedFor = useRef<Partial<Record<PeekId, number>>>({});
  const [wasOpen, setWasOpen] = useState(false);
  // true once the pointer has moved to another section while open; only then does the caret glide
  const [morph, setMorph] = useState(false);
  if (!!peek !== wasOpen) {
    setWasOpen(!!peek);
    if (peek) {
      setEpoch((n) => n + 1);
      setMorph(false);
    }
  }
  if (peek && peek !== last) {
    setLast(peek);
    if (wasOpen) {
      setMorph(true);
      setEpoch((n) => n + 1);
    }
  }
  const shown = peek ?? last;
  mountedFor.current[shown] = epoch;

  useLayoutEffect(() => {
    const el = panes.current[shown];
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);
  useLayoutEffect(() => {
    const place = () => {
      const vw = document.documentElement.clientWidth;
      setLeft((vw - Math.min(860, vw - 40)) / 2);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  const go = (to: string, section?: string) => () => onGo(to, section);

  return (
    <div
      className="nav-peek"
      data-open={peek || undefined}
      data-morph={morph || undefined}
      style={{ left, '--h': `${h}px`, '--caret': `${caret - left}px` } as CSSProperties}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      // @ts-expect-error inert is a valid attribute in React 18 DOM output
      inert={peek ? undefined : ''}
    >
      <i className="nav-peek-caret" aria-hidden="true" />
      {/* Research opens as a drop of liquid: the filter blurs the drop and the panel blob together, then cuts
          the blur back to a hard edge, so where they touch they melt into one shape. */}
      <svg className="peek-goo-defs" aria-hidden="true">
        <filter id="peek-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="10" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
        </filter>
      </svg>
      <div className="peek-goo" aria-hidden="true">
        <i className="peek-goo-drop" />
        <i className="peek-goo-body" />
      </div>
      <div className="nav-peek-body">
        {PEEK_ORDER.map((id) => (
          <div
            key={id}
            id={`peek-${id}`}
            ref={(n) => {
              panes.current[id] = n;
            }}
            className="nav-peek-pane"
            data-on={id === shown || undefined}
            aria-hidden={id !== shown}
          >
            <Fragment key={`${id}-${mountedFor.current[id] ?? 0}`}>
              {id === 'research' && <ResearchPeek go={go} />}
              {id === 'capabilities' && <CapabilitiesPeek go={go} />}
              {id === 'services' && <ServicesPeek go={go} />}
              {id === 'careers' && <CareersPeek go={go} />}
              {id === 'about' && <AboutPeek go={go} />}
              {id === 'contact' && <ContactPeek go={go} />}
            </Fragment>
          </div>
        ))}
      </div>
    </div>
  );
}

type Go = (to: string, section?: string) => () => void;

/** `figure` is optional: the Services panel names its library without a count. */
function Foot({ figure, label, blurb, cta, onClick, tone }: { figure?: string; label: string; blurb: string; cta: string; onClick: () => void; tone: HueName }) {
  return (
    <div className="peek-foot" style={toneStyle(tone, { '--k': 7 } as CSSProperties)}>
      <p>
        {figure && <b>{figure}</b>}
        <span>{label}</span>
        <small>{blurb}</small>
      </p>
      <button className="peek-go" onClick={onClick}>
        {cta} <Arrow size={13} />
      </button>
    </div>
  );
}

function ResearchPeek({ go }: { go: Go }) {
  return (
    <div className="peek-visual">
      <ul className="peek-domains">
        {DOMAINS.slice(0, 3).map((d, i) => (
          <li key={d.id} style={toneStyle(DOMAIN_TONES[i], { '--k': i } as CSSProperties)}>
            <button className="peek-tile peek-domain" onClick={go('/research', d.id)}>
              <span className="peek-domain-art">
                <DomainArt index={i} />
              </span>
              <b>{d.name}</b>
              <small>{d.field}</small>
            </button>
          </li>
        ))}
      </ul>
      <Foot figure="06" label="research domains" blurb="Separate programmes, one shared memory." cta="Open Research" onClick={go('/research')} tone="saffron" />
    </div>
  );
}

function CapabilitiesPeek({ go }: { go: Go }) {
  return (
    <div className="peek-visual">
      <ul className="peek-families">
        {CAPABILITY_GROUPS.map((g, gi) => {
          const Art = FAMILY_ART[gi];
          return (
            <li key={g} style={toneStyle(FAMILY_TONES[gi], { '--k': gi } as CSSProperties)}>
              <button className="peek-tile peek-family" onClick={go('/', 'capabilities')}>
                <span className="peek-family-art">
                  <Art />
                </span>
                <span className="peek-family-name">
                  {g}
                </span>
                <span className="peek-family-list">
                  {CAPABILITIES.slice(gi * 5, gi * 5 + 5).map((c) => (
                    <span key={c.name}>{c.name}</span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Foot figure="15" label="capabilities" blurb="Three families on one foundation." cta="See them in the story" onClick={go('/', 'capabilities')} tone="cobalt" />
    </div>
  );
}

function ServicesPeek({ go }: { go: Go }) {
  return (
    <div className="peek-visual">
      <ul className="peek-posts">
        {POSTS.slice(0, 3).map((p, i) => (
          <li key={p.slug} style={{ '--k': i } as CSSProperties}>
            <button className="peek-tile peek-post" onClick={go(`/services/${p.slug}`)}>
              <Cover index={i} label={p.category} />
              <small>
                {p.date} · {p.read}
              </small>
              <b>{p.title}</b>
            </button>
          </li>
        ))}
      </ul>
      <Foot label="Essays and notes" blurb="On memory, generative intelligence and infrastructure." cta="All services" onClick={go('/services')} tone="violet" />
    </div>
  );
}

function CareersPeek({ go }: { go: Go }) {
  const depts = Array.from(new Set(ROLES.map((r) => r.dept)));
  return (
    <div className="peek-grid">
      <ul className="peek-list">
        {ROLES.slice(0, 5).map((r, k) => (
          <li key={r.title} style={toneStyle(DEPT_TONE[r.dept], { '--k': k } as CSSProperties)}>
            <button className="peek-row" onClick={go('/careers', 'roles')}>
              <span className="peek-dot" />
              <span className="peek-row-text">
                <b>{r.title}</b>
                <small>
                  {r.team} · {r.location}
                </small>
              </span>
              <Arrow size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="peek-side" style={toneStyle('tangerine', { '--k': 6 } as CSSProperties)}>
        <p className="peek-side-figure is-words">Open roles</p>
        <ul className="peek-depts">
          {depts.map((d) => (
            <li key={d} style={toneStyle(DEPT_TONE[d])}>
              <i />
              {d}
            </li>
          ))}
        </ul>
        <button className="peek-go" onClick={go('/careers')}>
          See every role <Arrow size={13} />
        </button>
      </div>
    </div>
  );
}

const ABOUT_ROWS: { icon: IconName; title: string; body: string; tone: HueName; section?: string }[] = [
  { icon: 'building', title: 'Our story', body: 'Deep technology, designed in India.', tone: 'violet' },
  { icon: 'spark', title: 'Principles', body: `${PRINCIPLES.length} beliefs about what intelligence should be.`, tone: 'tangerine', section: 'principles' },
  { icon: 'rocket', title: 'Recognition', body: `${AWARDS.length} milestones since 2023.`, tone: 'saffron', section: 'recognition' },
  { icon: 'users', title: 'How we work', body: 'Built for decades, not quarters.', tone: 'violet', section: 'values' },
];

function AboutPeek({ go }: { go: Go }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list">
        {ABOUT_ROWS.map((r, k) => (
          <li key={r.title} style={toneStyle(r.tone, { '--k': k } as CSSProperties)}>
            <button className="peek-row" onClick={go('/about', r.section)}>
              <span className="peek-icon">
                <Icon name={r.icon} size={16} />
              </span>
              <span className="peek-row-text">
                <b>{r.title}</b>
                <small>{r.body}</small>
              </span>
              <Arrow size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="peek-side peek-side-ink" style={{ '--k': 5 } as CSSProperties}>
        <p className="peek-side-label">Work with the lab</p>
        <p className="peek-side-blurb">Joint research, fellowships and early deployments. Every message is read by a person.</p>
        <button className="peek-go" onClick={go('/contact')}>
          Start a conversation <Arrow size={13} />
        </button>
        <a className="peek-mail" href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </div>
    </div>
  );
}

const CONTACT_ROWS: { icon: IconName; title: string; body: string; tone: HueName; href?: string; to?: string }[] = [
  { icon: 'mail', title: EMAIL, body: 'General inquiries, briefings & early access.', tone: 'violet', href: `mailto:${EMAIL}` },
  { icon: 'flask', title: 'Research collaboration', body: 'For universities, fellows & foundational partners.', tone: 'saffron', to: '/contact' },
  { icon: 'shield', title: PRIVACY_EMAIL, body: 'Data governance, security & compliance queries.', tone: 'tangerine', href: `mailto:${PRIVACY_EMAIL}` },
  { icon: 'pin', title: HQ, body: 'Engineered in Bharat for the world.', tone: 'violet', to: '/about' },
];

function ContactPeek({ go }: { go: Go }) {
  return (
    <div className="peek-grid">
      <ul className="peek-list">
        {CONTACT_ROWS.map((r, k) => (
          <li key={r.title} style={toneStyle(r.tone, { '--k': k } as CSSProperties)}>
            {r.href ? (
              <a className="peek-row" href={r.href}>
                <span className="peek-icon">
                  <Icon name={r.icon} size={16} />
                </span>
                <span className="peek-row-text">
                  <b>{r.title}</b>
                  <small>{r.body}</small>
                </span>
                <Arrow size={13} dir="up-right" />
              </a>
            ) : (
              <button className="peek-row" onClick={go(r.to || '/contact')}>
                <span className="peek-icon">
                  <Icon name={r.icon} size={16} />
                </span>
                <span className="peek-row-text">
                  <b>{r.title}</b>
                  <small>{r.body}</small>
                </span>
                <Arrow size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="peek-side peek-side-ink" style={{ '--k': 5 } as CSSProperties}>
        <p className="peek-side-label">Direct communication</p>
        <p className="peek-side-blurb">Every message is read directly by our research and engineering teams. Tell us what you are building.</p>
        <button className="peek-go" onClick={go('/contact')}>
          Send a brief <Arrow size={13} />
        </button>
        <a className="peek-mail" href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </div>
    </div>
  );
}
