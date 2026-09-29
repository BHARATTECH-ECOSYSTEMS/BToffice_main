import { Chip, C, Icon, Label, Tag } from './atoms';
import { inOut, lerp, out, seg, smooth, window_ } from './math';
import type { Draw } from './Diagram';

export type NetFocus = 'sovereign' | 'edge' | 'world' | null;

const CORE = { x: 280, y: 184 };
const rad = (d: number) => (d * Math.PI) / 180;
const HUBS = [45, 135, 225, 315].map((a) => ({ x: CORE.x + 128 * Math.cos(rad(a)), y: CORE.y + 80 * Math.sin(rad(a)), a }));
const DEVICES = HUBS.flatMap((h, hi) =>
  [-24, 24].map((d) => ({ x: CORE.x + 236 * Math.cos(rad(h.a + d)), y: CORE.y + 150 * Math.sin(rad(h.a + d)), hub: hi })),
);
const SOURCES = [1, 4, 6];

export const network = (focus: NetFocus): Draw => (t, p) => {
  const hover = p.on > 0.3 ? DEVICES.findIndex((d) => Math.hypot(p.x - d.x, p.y - d.y) < 20) : -1;
  const src = hover >= 0 ? hover : SOURCES[Math.floor(t / 5) % 3];
  const l = t % 5;
  const S = DEVICES[src];
  const H = HUBS[S.hub];
  const dim = (on: boolean) => (focus && !on ? 0.28 : 1);
  const coreA = dim(focus === 'sovereign');
  const hubA = dim(focus === 'edge');
  const devA = dim(focus === 'edge' || focus === 'world');

  const up1 = inOut(seg(l, 0.2, 1.3));
  const up2 = inOut(seg(l, 1.3, 2.4));
  const pulse = seg(l, 2.4, 3.2);
  const down1 = (i: number) => inOut(seg(l, 2.7 + i * 0.03, 3.8));
  const down2 = inOut(seg(l, 3.8, 4.8));

  return (
    <g>
      {/* links */}
      {HUBS.map((h, i) => (
        <line key={i} x1={CORE.x} y1={CORE.y} x2={h.x} y2={h.y} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.4, opacity: hubA }} />
      ))}
      {DEVICES.map((d, i) => (
        <line key={i} x1={HUBS[d.hub].x} y1={HUBS[d.hub].y} x2={d.x} y2={d.y} style={{ stroke: 'var(--line-strong)', strokeWidth: 1.1, opacity: devA }} />
      ))}

      {/* core */}
      <g style={{ opacity: coreA }}>
        <circle cx={CORE.x} cy={CORE.y} r={34 + 26 * out(pulse)} fill="none" style={{ stroke: C.violet, strokeWidth: 1.4, opacity: pulse > 0 && pulse < 1 ? 0.5 * (1 - pulse) : 0 }} />
        <circle cx={CORE.x} cy={CORE.y} r={34} style={{ fill: C.violet }} />
        <Icon name="shield" x={CORE.x} y={CORE.y} s={1.5} tone="white" />
        <Label x={CORE.x} y={CORE.y + 54} text="Sovereign core · India" tone="violet" />
      </g>

      {/* national data centres */}
      {HUBS.map((h, i) => {
        const got = i === S.hub ? window_(l, 1.3, 2.6, 0.2) : window_(l, 3.8, 5.0, 0.25);
        return (
          <g key={i} style={{ opacity: hubA }}>
            <rect x={h.x - 20} y={h.y - 20} width={40} height={40} rx={10} style={{ fill: 'var(--card)', stroke: got > 0.05 ? C.violet : 'var(--line-strong)', strokeWidth: 1 + got * 0.8 }} />
            <Icon name="server" x={h.x} y={h.y} s={1.05} tone={got > 0.05 ? 'violet' : 'ink'} />
          </g>
        );
      })}

      {/* devices at the edge */}
      {DEVICES.map((d, i) => {
        const isSrc = i === src;
        const lit = isSrc ? window_(l, 0.05, 1.4, 0.2) : l > 4.5 ? window_(l, 4.5, 5.0, 0.2) : 0;
        return (
          <g key={i} style={{ opacity: devA }}>
            <circle cx={d.x} cy={d.y} r={13} style={{ fill: 'var(--card)', stroke: lit > 0.05 ? C.pitch : 'var(--line-strong)', strokeWidth: 1 + lit * 0.8 }} />
            <Icon name="phone" x={d.x} y={d.y} s={0.72} tone={lit > 0.05 ? 'pitch' : 'ink'} />
          </g>
        );
      })}

      {/* something learned on one device travels to the core, then out to everyone */}
      {up1 > 0 && up1 < 1 && <Chip x={lerp(S.x, H.x, up1)} y={lerp(S.y, H.y, up1)} w={22} h={11} tone="pitch" lines={false} />}
      {up2 > 0 && up2 < 1 && <Chip x={lerp(H.x, CORE.x, up2)} y={lerp(H.y, CORE.y, up2)} w={24} h={12} tone="pitch" />}
      {HUBS.map((h, i) => {
        const u = down1(i);
        return i !== S.hub && u > 0 && u < 1 ? <Chip key={i} x={lerp(CORE.x, h.x, u)} y={lerp(CORE.y, h.y, u)} w={22} h={11} tone="pitch" lines={false} /> : null;
      })}
      {DEVICES.map((d, i) => {
        const u = down2;
        const h = HUBS[d.hub];
        return d.hub !== S.hub && u > 0 && u < 1 ? <Chip key={i} x={lerp(h.x, d.x, u)} y={lerp(h.y, d.y, u)} w={16} h={9} tone="pitch" lines={false} /> : null;
      })}

      {/* legend */}
      <g style={{ opacity: smooth(seg(t, 0.2, 0.8)) }}>
        <circle cx={40} cy={360} r={5} style={{ fill: C.violet }} />
        <Label x={50} y={364} text="Core" anchor="start" size={10.5} />
        <rect x={94} y={355} width={10} height={10} rx={3} style={{ fill: 'none', stroke: C.violet, strokeWidth: 1.4 }} />
        <Label x={110} y={364} text="National data centres" anchor="start" size={10.5} />
        <circle cx={250} cy={360} r={5} style={{ fill: 'none', stroke: C.pitch, strokeWidth: 1.4 }} />
        <Label x={260} y={364} text="Devices at the edge" anchor="start" size={10.5} />
        <rect x={396} y={355} width={16} height={10} rx={5} style={{ fill: C.pitch }} />
        <Label x={418} y={364} text="What it learns" anchor="start" size={10.5} />
      </g>
      {focus === 'world' && <Tag x={CORE.x} y={26} text="Any region, any language" tone="pitch" />}
      {focus === 'sovereign' && <Tag x={CORE.x} y={26} text="Data stays under national control" tone="violet" />}
      {focus === 'edge' && <Tag x={CORE.x} y={26} text="Same intelligence from data centre to phone" tone="pitch" />}
    </g>
  );
};
