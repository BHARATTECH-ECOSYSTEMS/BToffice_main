import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ServiceJourney, type CardOrigin, type JourneyChapter } from '../components/ServiceJourney';
import { ServiceDialog } from '../components/ServiceDialog';
import { Arrow, BtnText, Headline, Reveal } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { SERVICES, type ServiceCard, type ServiceKind } from '../content';

/** What each group of cards holds, said in a line each, as the helix carries them past. */
const GROUP_COPY: { kind: ServiceKind; title: string; text: string }[] = [
  { kind: 'service', title: 'What we build', text: 'Search, memory, agents, vision, voice, geospatial and edge AI, hosted where your data has to stay.' },
  { kind: 'approach', title: 'How we work', text: 'Start with one real problem, keep every answer traceable, and stay sovereign by default.' },
  { kind: 'sector', title: 'Who it is for', text: 'Enterprises, governments, universities and labs, and developers building on our APIs.' },
];

/** A section the site's own 3D scene stays out of. */
function useQuietRef() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return ref;
}

/**
 * Services: every service, how we work and who it is for, as cards that travel through a corridor, onto a helix
 * and into a ring as the page scrolls (ServiceJourney). Any card opens into a reading pop-up (ServiceDialog);
 * the cards are the only place the details live.
 */
export function Services() {
  const [open, setOpen] = useState<{ card: ServiceCard; from: CardOrigin } | null>(null);
  const journeyRef = useQuietRef();
  const ctaRef = useQuietRef();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const chapters: JourneyChapter[] = [
    {
      label: 'Travel',
      content: <Headline as="h1" className="svc-h1" lines={['Services, built on', 'one intelligence.']} accent={1} show={ready} />,
    },
    {
      label: 'Unwind',
      content: (
        <>
          <div className="svc-chapter__intro">
            <Headline className="svc-h2" lines={['One thread runs', 'through all of it.']} accent={1} />
            <Reveal className="svc-caption__side">
              <p>What we build, how we work and who it is for, wound around the same core and moving together.</p>
            </Reveal>
          </div>
          {GROUP_COPY.map((g) => (
            <Reveal key={g.kind} className={`svc-group is-${g.kind}`}>
              <h3 className="svc-group__title">
                <span className="svc-group__dot" aria-hidden="true" />
                {g.title}
              </h3>
              <p>{g.text}</p>
            </Reveal>
          ))}
        </>
      ),
    },
    {
      label: 'Choose',
      content: (
        <>
          <Headline className="svc-h2" lines={['Now pick one', 'and read it.']} accent={1} />
          <Reveal className="svc-caption__side">
            <p>Each card opens to what it covers and what you get from it, with a way to start.</p>
            <p className="svc-caption__hint">Move across the cards to turn the ring</p>
          </Reveal>
        </>
      ),
    },
  ];

  return (
    <div className="svc">
      <ServiceJourney ref={journeyRef} items={SERVICES} chapters={chapters} openId={open?.card.id} onOpen={(card, from) => setOpen({ card, from })} />

      <section ref={ctaRef} className="section svc-cta">
        <div className="wrap svc-cta-inner">
          <Headline className="h2" lines={['Not sure which', 'one fits?']} accent={1} />
          <Reveal className="svc-cta-copy" delay={100}>
            <p>Tell us the problem in a few lines. We will tell you which of these would help, and what a first pilot could look like.</p>
            <Link to="/contact" className="btn btn-primary btn-lg">
              <BtnText>Start a conversation</BtnText> <Arrow />
            </Link>
          </Reveal>
        </div>
      </section>

      {open && <ServiceDialog key={open.card.id} card={open.card} from={open.from} onClose={() => setOpen(null)} />}
    </div>
  );
}
