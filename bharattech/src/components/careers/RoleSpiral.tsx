import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BtnText, Headline, toneStyle } from '../ui';
import { useQuiet, useScene } from '../../gl/Scene';
import { DEPT_TONES, type ROLES } from '../../content';
import { mountRoleSpiral, type RoleSpiral as Spiral } from '../../gl/careers/roleSpiral';
import { pinnedScrollTop, useHosts, useStageFrames } from './useStageFrames';
import { buildWhenQuietOrNear } from '../warmQueue';

export type Role = (typeof ROLES)[number];

/**
 * "Open roles": every role on a spiral the page scrolls round (gl/careers/roleSpiral.ts). The filters above it
 * (`controls`) narrow the spiral without rebuilding it: dropped cards sink out and the rest close up. The strip under
 * it says, in plain type, which role is at the front, with its details, Apply, and steps to the roles either side.
 * The strip holds the only Apply button, so there is one clear way to apply. A card at the front applies on a click
 * too; any other card is brought to the front first.
 */
export function RoleSpiral({
  roles,
  keep,
  controls,
  applyHref,
  onClear,
}: {
  roles: Role[];
  keep: boolean[];
  controls: ReactNode;
  applyHref: (r: Role) => string;
  onClear: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const hosts = useHosts(roles.length, 'cr-host cr-role-host');
  const frame = useStageFrames(sectionRef, pinRef);
  const spiral = useRef<Spiral | null>(null);
  const [front, setFront] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(sectionRef);
  const kept = keep.filter(Boolean).length;
  // the spiral is built a little after the page opens, and starts from the filters chosen by then
  const keepNow = useRef(keep);
  keepNow.current = keep;

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = glRef.current;
    if (!section || !stage || !canvas) return;
    let s: Spiral | null = null;
    const cancel = buildWhenQuietOrNear(section, () => {
      s = mountRoleSpiral({ stage, canvas, hosts, onFront: setFront });
      if (keepNow.current.some((k) => !k)) s.setKeep(keepNow.current);
      spiral.current = s;
      frame.current = s.frame;
    });
    return () => {
      cancel();
      frame.current = null;
      spiral.current = null;
      s?.destroy();
    };
  }, [hosts, frame]);

  useEffect(() => spiral.current?.setKeep(keep), [keep]);

  const goToSlot = (slot: number) => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const s = spiral.current;
    if (section && pin && s && slot >= 0 && slot < kept) scrollTo(pinnedScrollTop(section, pin, s.progressOf(slot)));
  };
  const role = front >= 0 ? roles[front] : null;

  return (
    <section ref={sectionRef} id="roles" className="cr-roles" aria-labelledby="cr-roles-title">
      <div ref={pinRef} className="cr-roles__pin">
        <div ref={stageRef} className="cr-roles__stage">
          <canvas ref={glRef} className="cr-gl" aria-hidden="true" />
        </div>

        <div className="cr-roles__head wrap">
          <div id="cr-roles-title">
            <Headline lines={['Open roles,', 'one at a time.']} />
          </div>
          <div className="cr-roles__controls">{controls}</div>
        </div>

        {kept === 0 && (
          <div className="cr-roles__empty">
            <p>No roles match that filter.</p>
            <button type="button" className="btn btn-light" onClick={onClear}>
              <BtnText>Show every role</BtnText>
            </button>
          </div>
        )}

        <div className="cr-roles__strip wrap" aria-live="polite">
          {role && kept > 0 && (
            <div key={role.title} className="cr-strip" style={toneStyle(DEPT_TONES[role.dept])}>
              <div className="cr-strip__text">
                <b>{role.title}</b>
                <span>{[role.focus, role.team, role.location, role.type].filter((v, k, all) => all.indexOf(v) === k).join(' · ')}</span>
              </div>
              <a href={applyHref(role)} className="btn btn-primary cr-strip__apply">
                <BtnText>Apply</BtnText>
              </a>
            </div>
          )}
        </div>
      </div>

      {hosts.map((host, i) =>
        createPortal(
          <a
            href={applyHref(roles[i])}
            className="cr-role"
            style={toneStyle(DEPT_TONES[roles[i].dept])}
            tabIndex={keep[i] ? undefined : -1}
            aria-hidden={keep[i] ? undefined : true}
            onClick={(e) => {
              // a card away from the front comes to the front first; the front card applies
              if (i !== front) {
                e.preventDefault();
                goToSlot(spiral.current?.slotOf(i) ?? -1);
              }
            }}
            onFocus={(e) => {
              if (e.currentTarget.matches(':focus-visible')) goToSlot(spiral.current?.slotOf(i) ?? -1);
            }}
          >
            <span className="cr-role__dept">
              <i aria-hidden="true" />
              {roles[i].dept}
            </span>
            <b className="cr-role__title">{roles[i].title}</b>
            <span className="cr-role__focus">{roles[i].focus}</span>
            <span className="cr-role__facts">
              <span>{roles[i].team}</span>
              <span>{roles[i].location}</span>
              <span>{roles[i].type}</span>
            </span>
          </a>,
          host,
          roles[i].title,
        ),
      )}
    </section>
  );
}
