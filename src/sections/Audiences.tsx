import { useRef } from 'react';
import { useFormation } from '../gl/Scene';
import { Fade, SectionHead } from '../components/Reveal';
import { AUDIENCE_DETAIL } from '../content';

const ICONS = [
  // researchers: a flask
  'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  // developers: code
  'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16',
  // enterprises: a building
  'M4 21V5l8-2v18M12 8l8 2v11M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2',
  // governments: a civic building
  'M3 9l9-5 9 5M4 9h16M6 9v9M10 9v9M14 9v9M18 9v9M3 21h18M4 18h16',
  // education: a cap
  'M2 9l10-5 10 5-10 5L2 9zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6',
  // startups: a spark taking off
  'M12 3c3 2 5 5.5 5 9.5L15 17H9l-2-4.5C7 8.5 9 5 12 3zM12 10.5a1.5 1.5 0 1 0 0-.01M9 17l-2 4M15 17l2 4M12 17v4',
];

export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'orbit6', params: { alpha: 0 } });
  return (
    <section id="audiences" ref={ref} className="section audiences" data-chapter="Who it’s for">
      <div className="wrap">
        <SectionHead
          index="08"
          label="Who it’s for"
          title={['One intelligence,', 'shaped for your work.']}
          lede="The same memory and reasoning underneath, for people with very different jobs to do."
        />
        <div className="aud-grid">
          {AUDIENCE_DETAIL.map((a, i) => (
            <Fade key={a.name} delay={(i % 3) * 80} className="aud-card">
              <div className="aud-art" aria-hidden="true">
                <span className="aud-ring" />
                <span className="aud-ring aud-ring-2" />
                <span className="aud-icon">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[i]} />
                  </svg>
                </span>
                <span className="aud-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="aud-text">
                <h3>{a.name}</h3>
                <p>{a.line}</p>
                <ul>
                  {a.uses.map((u) => (
                    <li key={u}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                      </svg>
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
