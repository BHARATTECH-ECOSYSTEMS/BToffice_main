import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useQuiet, useScene } from '../gl/Scene';
import { AudienceSchematic } from '../components/AudienceSchematic';
import { AUDIENCE_DETAIL, AUDIENCE_TONES } from '../content';
import { toneStyle } from '../components/ui';

gsap.registerPlugin(ScrollTrigger);

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(ref);

  useEffect(() => {
    const section = ref.current!;
    const panels = Array.from(section.querySelectorAll<HTMLElement>('.svc-panel'));
    const fills = section.querySelectorAll<HTMLElement>('.svc-list__fill');
    const motion = gsap.matchMedia();
    let disposed = false;
    let refreshFrame = 0;

    motion.add({ reduce: '(prefers-reduced-motion: reduce)', animate: '(prefers-reduced-motion: no-preference)' }, (context) => {
      const reduced = !!context.conditions?.reduce;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          const panel = target as HTMLElement;
          panel.toggleAttribute('data-in-view', isIntersecting);
          const svg = panel.querySelector<SVGSVGElement>('.svc-schematic__svg');
          if (reduced || !isIntersecting) svg?.pauseAnimations();
          else svg?.unpauseAnimations();
        });
      });
      panels.forEach((panel, i) => {
        panel.querySelector<SVGSVGElement>('.svc-schematic__svg')?.pauseAnimations();
        observer.observe(panel);
        if (reduced) {
          fills[i].style.transform = 'scaleX(1)';
          return;
        }
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 45%',
          end: 'bottom 45%',
          onEnter: () => setActiveIdx(i),
          onEnterBack: () => setActiveIdx(i),
          onLeave: () => setActiveIdx(Math.min(i + 1, panels.length - 1)),
          onLeaveBack: () => setActiveIdx(Math.max(0, i - 1)),
          onUpdate: (self) => { fills[i].style.transform = `scaleX(${self.progress})`; },
          onRefresh: (self) => {
            fills[i].style.transform = `scaleX(${self.progress})`;
            if (self.isActive) setActiveIdx(i);
            if (i === 0 && self.progress === 0) setActiveIdx(0);
            if (i === panels.length - 1 && self.progress === 1) setActiveIdx(i);
          },
        });
      });
      return () => observer.disconnect();
    }, section);

    // Re-measure only when content dimensions change (including fonts), never on scroll.
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const resize = new ResizeObserver(refresh);
    resize.observe(section);
    document.fonts.ready.then(() => { if (!disposed) refresh(); });
    return () => {
      disposed = true;
      resize.disconnect();
      cancelAnimationFrame(refreshFrame);
      motion.revert();
    };
  }, []);

  const go = (idx: number) => {
    const panel = ref.current?.querySelector<HTMLElement>(`#service-${idx}`);
    if (!panel) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setActiveIdx(idx);
    scrollTo(window.scrollY + panel.getBoundingClientRect().top - Math.min(120, window.innerHeight * 0.2), reduced);
  };

  return (
    <section id="who" ref={ref} className="section svc-section svc-scroll" aria-labelledby="services-heading">
      <div className="wrap svc-showcase">
        <div className="svc-left-col">
          <div className="svc-eyebrow"><span className="svc-eyebrow__dot" />WHO IT’S FOR</div>
          <h2 id="services-heading" className="svc-headline">
            Built for the people<br /><span className="is-accent">who build what’s next.</span>
          </h2>
          <nav className="svc-list" aria-label="Who it’s for">
            {AUDIENCE_DETAIL.map((item, idx) => (
              <button
                key={item.name}
                type="button"
                className={`svc-list__item ${activeIdx === idx ? 'is-active' : ''}`}
                aria-current={activeIdx === idx ? 'true' : undefined}
                aria-controls={`service-${idx}`}
                onClick={() => go(idx)}
                style={toneStyle(AUDIENCE_TONES[idx] || 'violet')}
              >
                <span className="svc-list__header">
                  <span className="svc-list__num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="svc-list__name">{item.name}</span>
                </span>
                <span className="svc-list__track" aria-hidden="true"><span className="svc-list__fill" /></span>
              </button>
            ))}
          </nav>
        </div>
        <div className="svc-panel-wrap">
          {AUDIENCE_DETAIL.map((item, idx) => {
            const tone = AUDIENCE_TONES[idx] || 'violet';
            return (
              <article key={item.name} id={`service-${idx}`} aria-labelledby={`service-title-${idx}`}
                className={`svc-panel ${activeIdx === idx ? 'is-active' : ''}`} style={toneStyle(tone)}>
                {/* Top Animated Vector Schematic (Floating directly with no separate container box) */}
                <div className="svc-panel__schematic">
                  <AudienceSchematic index={idx} tone={tone} />
                </div>

                {/* Panel Content Header */}
                <div className="svc-panel__content">
                  <h3 id={`service-title-${idx}`} className="svc-panel__title">{item.name}</h3>
                  <p className="svc-panel__desc">{item.line}</p>

                  {/* 2-Column Capability Checklist */}
                  <div className="svc-panel__grid">
                    {item.uses.map((useText, uIdx) => (
                      <div key={uIdx} className="svc-panel__check-item">
                        <div className="svc-panel__check-icon">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2L4.8 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <span className="svc-panel__check-text">{useText}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer: SEEN IN / POWERED BY text links */}
                  <div className="svc-panel__footer">
                    <span className="svc-panel__footer-label">SEEN IN</span>
                    <div className="svc-panel__seen-items">
                      {item.poweredBy && item.poweredBy.map((engine) => (
                        <span key={engine} className="svc-panel__seen-link">
                          {engine}
                        </span>
                      ))}
                      <span className="svc-panel__seen-more">+3 more</span>
                    </div>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
