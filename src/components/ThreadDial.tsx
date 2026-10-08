import type { CSSProperties } from 'react';
import { ORIGIN_POINT } from '../gl/threads';
import type { HueName } from '../gl/palette';

/** Where each thread enters the sphere (unit disk, y up): memory, connection, learning. */
const ENTRY: [number, number][] = [
  [-0.995, 0.03],
  [-0.89, -0.455],
  [-0.35, -0.937],
];

export interface DialThread {
  name: string;
  state: string;
  /** a failure is marked in the chapter's tone, a working thread in emerald */
  ok?: boolean;
  tone?: HueName;
}

/**
 * Labels for the logo's three threads, drawn over the 3D mark: a leader from where each thread enters the
 * sphere to a chip that names it and says what is happening to it, plus the origin point where they meet.
 * `room` must match the size the section asked the mark to fit in (MARK_SIZE * room).
 */
export function ThreadDial({ threads, room, active = -1, origin, originOk = true }: { threads: DialThread[]; room: number; active?: number; origin?: string; originOk?: boolean }) {
  const r = 88.9 / room;
  const o = [ORIGIN_POINT[0] * r, -ORIGIN_POINT[1] * r];
  return (
    <div className="dial" aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <circle r={r + 6} className="dial-ring" />
        {threads.map((t, i) => {
          const [x, y] = ENTRY[i];
          const a = [x * r, -y * r];
          const b = [x * (r + 22), -y * (r + 22)];
          return <path key={t.name} d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} className="dial-lead" data-on={active < 0 || active === i || undefined} />;
        })}
        {origin && (
          <>
            <circle cx={o[0]} cy={o[1]} r="4.2" className="dial-origin" data-ok={originOk || undefined} />
            <path d={`M${o[0] + 4} ${o[1] - 4} L${r * 0.78} ${-r * 0.86} H${r + 14}`} className="dial-lead" data-on />
          </>
        )}
      </svg>
      {threads.map((t, i) => {
        const [x, y] = ENTRY[i];
        return (
          <span
            key={t.name}
            className="dial-chip"
            data-on={active < 0 || active === i || undefined}
            data-ok={t.ok || undefined}
            style={{ left: `${50 + (x * (r + 22)) / 2}%`, top: `${50 - (y * (r + 22)) / 2}%`, '--chip': t.tone ? `var(--${t.tone})` : undefined } as CSSProperties}
          >
            <small>{String(i + 1).padStart(2, '0')}</small>
            <b>{t.name}</b>
            <em key={t.state}>{t.state}</em>
          </span>
        );
      })}
      {origin && (
        <span className="dial-chip is-origin" data-on data-ok={originOk || undefined} style={{ left: `${50 + (r + 14) / 2}%`, top: `${50 - (r * 0.86) / 2}%` }}>
          <b>Origin</b>
          <em key={origin}>{origin}</em>
        </span>
      )}
    </div>
  );
}
