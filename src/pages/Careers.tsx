import { useMemo, useState } from 'react';
import { PageHero, Quiet } from '../components/PageHero';
import { Arrow, Headline, Reveal, toneStyle, BtnText } from '../components/ui';
import { DEPT_TONES, EMAIL, EMAIL_HREF, ROLES, VALUES } from '../content';
import { Icon } from '../components/fx';
import { isCompact, useScene } from '../gl/Scene';
import { DomainArt } from '../components/art';
import { TeamRing, type Team } from '../components/careers/TeamRing';
import { ValueTunnel, type Value } from '../components/careers/ValueTunnel';
import { RoleSpiral, type Role } from '../components/careers/RoleSpiral';
import type { HueName } from '../gl/palette';

const applyHref = (r: Role) => `mailto:${EMAIL}?subject=${encodeURIComponent(`Application: ${r.title}, ${r.focus}`)}`;

/** Which research drawing each team gets on its cards. */
const TEAM_ART: Record<string, number> = {
  'GI Rivinity': 0,
  'Rivinity Core': 1,
  'IoT Intelligence': 2,
  'Geo Intelligence': 3,
  'Defense Intelligence': 4,
  Platform: 5,
  Communications: 1,
};

/** Every team with an open role, in the order the roles list them, with the department its first role is in. */
const TEAMS: Team[] = ROLES.reduce<Team[]>((list, r) => {
  if (!list.some((t) => t.name === r.team)) list.push({ name: r.team, dept: r.dept, art: TEAM_ART[r.team] ?? 0 });
  return list;
}, []);

const VALUE_LOOK: { icon: Value['icon']; tone: HueName }[] = [
  { icon: 'clock', tone: 'violet' },
  { icon: 'layers', tone: 'tangerine' },
  { icon: 'spark', tone: 'saffron' },
  { icon: 'rocket', tone: 'violet' },
];
const VALUE_CARDS: Value[] = VALUES.map((v, i) => ({ ...v, ...VALUE_LOOK[i % VALUE_LOOK.length] }));

const DEPTS = ['All', 'Research', 'Engineering', 'Operations'];

/**
 * Careers, built from three formations: the teams on a turning ring in the hero, the values down a tunnel the page
 * scrolls through, and the open roles on a spiral. Phones and reduced motion get the same content as plain,
 * readable sections instead (a values grid and a filterable list of role cards).
 */
export function Careers() {
  const { scrollTo } = useScene();
  const [flat] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches || isCompact());
  const [dept, setDept] = useState('All');
  // a team picked on the hero's ring narrows the roles to it, shown as its own chip beside the departments
  const [team, setTeam] = useState<Team | null>(null);
  const keep = useMemo(() => ROLES.map((r) => (team ? r.team === team.name : dept === 'All' || r.dept === dept)), [dept, team]);
  const clear = () => {
    setDept('All');
    setTeam(null);
  };
  const toRoles = () => {
    const roles = document.getElementById('roles');
    if (roles) scrollTo(roles);
  };

  const controls = (
    <>
      <div className="segmented" role="group" aria-label="Department">
        {DEPTS.map((d) => (
          <button
            key={d}
            aria-pressed={!team && dept === d}
            style={toneStyle(DEPT_TONES[d] ?? 'violet')}
            onClick={() => {
              setDept(d);
              setTeam(null);
            }}
          >
            <i aria-hidden="true" />
            {d}
          </button>
        ))}
        {team && (
          <button aria-pressed="true" aria-label={`${team.name}: show every team`} style={toneStyle(DEPT_TONES[team.dept] ?? 'violet')} onClick={() => setTeam(null)}>
            <i aria-hidden="true" />
            {team.name}
            <span className="cr-chip-x" aria-hidden="true">
              ×
            </span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="cr">
      <PageHero
        tone="tangerine"
        title={['Build the', 'foundation.']}
        lede="We hire researchers and engineers who would rather spend a decade on the right problem than a quarter on the easy one."
        visual={
          <TeamRing
            teams={TEAMS}
            onPick={(t) => {
              setDept('All');
              setTeam(t);
              toRoles();
            }}
          />
        }
      >
        <a
          href="#roles"
          className="btn btn-primary page-hero-cta"
          onClick={(e) => {
            e.preventDefault();
            toRoles();
          }}
        >
          <BtnText>See open roles</BtnText> <Arrow dir="down" />
        </a>
      </PageHero>

      {flat ? <ValueGrid values={VALUE_CARDS} /> : <ValueTunnel values={VALUE_CARDS} />}

      {flat ? (
        <RoleList keep={keep} controls={controls} onClear={clear} />
      ) : (
        <RoleSpiral roles={ROLES} keep={keep} controls={controls} applyHref={applyHref} onClear={clear} />
      )}

      <Quiet className="section cr-close">
        <div className="wrap cr-close__inner">
          <Headline lines={['Not on the list?', 'Tell us what you build.']} />
          <Reveal className="cr-close__copy" delay={100}>
            <p>Send a few lines about the problem you want to spend years on, and what you have already built toward it.</p>
            <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              <BtnText>Write to {EMAIL}</BtnText> <Arrow />
            </a>
          </Reveal>
        </div>
      </Quiet>
    </div>
  );
}

/** The values as a plain grid, for phones and reduced motion. */
function ValueGrid({ values }: { values: Value[] }) {
  return (
    <Quiet>
      <div className="wrap">
        <Headline lines={['What we', 'hold to.']} />
        <div className="bento values-bento cr-values-grid">
          {values.map((v, i) => (
            <Reveal key={v.title} className="cell" delay={i * 60} style={toneStyle(v.tone)}>
              <span className="icon-tile">
                <Icon name={v.icon} />
              </span>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </Quiet>
  );
}

/** The roles as a filterable list of cards, for phones and reduced motion. */
function RoleList({ keep, controls, onClear }: { keep: boolean[]; controls: React.ReactNode; onClear: () => void }) {
  const roles = ROLES.filter((_, i) => keep[i]);
  return (
    <Quiet id="roles">
      <div className="wrap">
        <Headline lines={['Open roles,', 'every team.']} />
        <div className="roles-bar cr-roles-bar">{controls}</div>
        <ul className="role-grid">
          {roles.map((r, i) => (
            <Reveal as="li" key={r.title} delay={(i % 3) * 70} style={toneStyle(DEPT_TONES[r.dept])}>
              <a href={applyHref(r)} className="role-card">
                <span className="role-art">
                  <DomainArt index={TEAM_ART[r.team] ?? 0} />
                  <span className="role-dept">
                    <i aria-hidden="true" />
                    {r.dept}
                  </span>
                </span>
                <span className="role-body">
                  <b>{r.title}</b>
                  <small>{r.focus}</small>
                  <span className="role-facts">
                    <span>{r.team}</span>
                    <span>{r.location}</span>
                  </span>
                  <span className="role-go">Apply</span>
                </span>
              </a>
            </Reveal>
          ))}
        </ul>
        {roles.length === 0 && (
          <p className="empty">
            No roles match that filter.{' '}
            <button type="button" className="cr-link" onClick={onClear}>
              Show every role
            </button>
          </p>
        )}
      </div>
    </Quiet>
  );
}
