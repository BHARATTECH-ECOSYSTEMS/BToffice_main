import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DomainArt } from '../art';
import { Arrow, toneStyle } from '../ui';
import { DEPT_TONES } from '../../content';
import { mountTeamRing, type TeamRing as Ring } from '../../gl/careers/teamRing';
import { useHosts, useStageFrames } from './useStageFrames';

export interface Team {
  name: string;
  dept: string;
  art: number;
}

/**
 * The hero's ring of teams (gl/careers/teamRing.ts does the 3D). Each card is a real button: choosing a team takes
 * the visitor to the open roles, narrowed to that team.
 */
export function TeamRing({ teams, onPick }: { teams: Team[]; onPick: (team: Team) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hosts = useHosts(teams.length, 'cr-host cr-team-host');
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const frame = useStageFrames(wrapRef);
  const ring = useRef<Ring | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = mountTeamRing({ stage, hosts, reduced });
    ring.current = r;
    frame.current = (now) => r.frame(now);
    return () => {
      frame.current = null;
      ring.current = null;
      r.destroy();
    };
  }, [hosts, reduced, frame]);

  return (
    <div ref={wrapRef} className="cr-ring">
      <div ref={stageRef} className="cr-ring__stage" role="group" aria-label="Teams" />
      <p className="cr-ring__hint">Pick a team to see its roles</p>
      {hosts.map((host, i) =>
        createPortal(
          <button
            type="button"
            className="cr-team"
            style={{ ...toneStyle(DEPT_TONES[teams[i].dept] ?? 'violet'), '--i': i } as CSSProperties}
            onClick={() => {
              if (!ring.current?.dragged()) onPick(teams[i]);
            }}
          >
            <span className="cr-team__art">
              <DomainArt index={teams[i].art} />
            </span>
            <span className="cr-team__body">
              <span className="cr-team__dept">
                <i aria-hidden="true" />
                {teams[i].dept}
              </span>
              <b className="cr-team__name">{teams[i].name}</b>
              <span className="cr-team__go">
                See roles <Arrow size={12} />
              </span>
            </span>
          </button>,
          host,
          teams[i].name,
        ),
      )}
    </div>
  );
}
