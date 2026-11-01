import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../fx';
import { Headline, toneStyle } from '../ui';
import { useQuiet, useScene } from '../../gl/Scene';
import { mountValueTunnel, type ValueTunnel as Tunnel } from '../../gl/careers/valueTunnel';
import type { HueName } from '../../gl/palette';
import { pinnedScrollTop, useHosts, useStageFrames } from './useStageFrames';
import { buildWhenQuietOrNear } from '../warmQueue';

export interface Value {
  title: string;
  body: string;
  icon: IconName;
  tone: HueName;
}

/**
 * "What we hold to": the values, one after another down a round tunnel the page scrolls through
 * (gl/careers/valueTunnel.ts). A list beside it names every value, marks the one being read and jumps to any of them.
 */
export function ValueTunnel({ values }: { values: Value[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const hosts = useHosts(values.length, 'cr-host cr-value-host');
  const frame = useStageFrames(sectionRef, pinRef);
  const tunnel = useRef<Tunnel | null>(null);
  const [current, setCurrent] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(sectionRef);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = glRef.current;
    if (!section || !stage || !canvas) return;
    let t: Tunnel | null = null;
    const cancel = buildWhenQuietOrNear(section, () => {
      t = mountValueTunnel({ stage, canvas, hosts, onCurrent: setCurrent });
      tunnel.current = t;
      frame.current = t.frame;
    });
    return () => {
      cancel();
      frame.current = null;
      tunnel.current = null;
      t?.destroy();
    };
  }, [hosts, frame]);

  const goTo = (k: number) => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (section && pin && tunnel.current) scrollTo(pinnedScrollTop(section, pin, tunnel.current.stopOf(k)));
  };

  return (
    <section ref={sectionRef} className="cr-values" aria-labelledby="cr-values-title" style={{ '--count': values.length } as CSSProperties}>
      <div ref={pinRef} className="cr-values__pin">
        <div ref={stageRef} className="cr-values__stage">
          <canvas ref={glRef} className="cr-gl" aria-hidden="true" />
        </div>
        <div className="cr-values__copy wrap">
          <div id="cr-values-title">
            <Headline lines={['What we', 'hold to.']} />
          </div>
          <nav className="cr-values__index" aria-label="Values">
            {values.map((v, k) => (
              <button key={v.title} type="button" aria-current={current === k ? 'step' : undefined} style={toneStyle(v.tone)} onClick={() => goTo(k)}>
                <i aria-hidden="true" />
                {v.title}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {hosts.map((host, k) =>
        createPortal(
          <article className="cr-value" style={toneStyle(values[k].tone)} aria-current={current === k || undefined}>
            <span className="cr-value__icon" aria-hidden="true">
              <Icon name={values[k].icon} />
            </span>
            <h3 className="cr-value__title">{values[k].title}</h3>
            <p className="cr-value__body">{values[k].body}</p>
          </article>,
          host,
          values[k].title,
        ),
      )}
    </section>
  );
}
