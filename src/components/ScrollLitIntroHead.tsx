import { useEffect, useRef, useState } from 'react';

const TITLE_LINES = [
  'AI that remembers, connects',
  'and keeps learning.',
];

const LEDE_TEXT =
  'Most AI tools start from zero every time, work alone and stop learning once they are trained. We are building the layer underneath them: one shared intelligence that every application can draw on.';

interface ParsedWord {
  word: string;
  charIndices: number[];
}

interface ParsedLine {
  words: ParsedWord[];
}

export function ScrollLitIntroHead() {
  const containerRef = useRef<HTMLElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevLitRef = useRef<number[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Pre-parse the title lines and lede into word & character structures
  // so word wrapping remains natural with native spaces between words.
  const { titleLines, ledeWords, totalChars, charTargets } = useRef(() => {
    let globalIndex = 0;

    // 1. Process Title Lines
    const parsedTitleLines: ParsedLine[] = [];
    const titleCharIndices: number[] = [];

    TITLE_LINES.forEach((line) => {
      const words = line.split(' ');
      const parsedWords: ParsedWord[] = [];

      words.forEach((w) => {
        const charIndices: number[] = [];
        for (let i = 0; i < w.length; i++) {
          charIndices.push(globalIndex);
          titleCharIndices.push(globalIndex);
          globalIndex++;
        }
        parsedWords.push({ word: w, charIndices });
      });

      parsedTitleLines.push({ words: parsedWords });
    });

    const titleEndIndex = globalIndex;

    // 2. Process Lede
    const parsedLedeWords: ParsedWord[] = [];
    const ledeCharIndices: number[] = [];
    const rawLedeWords = LEDE_TEXT.split(' ');

    rawLedeWords.forEach((w) => {
      const charIndices: number[] = [];
      for (let i = 0; i < w.length; i++) {
        charIndices.push(globalIndex);
        ledeCharIndices.push(globalIndex);
        globalIndex++;
      }
      parsedLedeWords.push({ word: w, charIndices });
    });

    const count = globalIndex;

    // 3. Calculate target progress for each character
    // Title occupies scroll progression from 0.02 to 0.42
    // Lede occupies scroll progression from 0.40 to 0.98
    const targets = new Float32Array(count);

    const titleCount = titleEndIndex;
    for (let i = 0; i < titleCount; i++) {
      targets[i] = 0.02 + (i / Math.max(1, titleCount - 1)) * 0.38;
    }

    const ledeCount = count - titleEndIndex;
    for (let i = 0; i < ledeCount; i++) {
      const gIdx = titleEndIndex + i;
      targets[gIdx] = 0.40 + (i / Math.max(1, ledeCount - 1)) * 0.58;
    }

    return {
      titleLines: parsedTitleLines,
      ledeWords: parsedLedeWords,
      totalChars: count,
      charTargets: targets,
    };
  }).current();

  useEffect(() => {
    setIsMounted(true);
    prevLitRef.current = new Array(totalChars).fill(-1);

    let raf = 0;
    let lastProgress = -1;

    const updateScrollLit = () => {
      raf = 0;
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Illumination journey:
      // Begins as header enters lower viewport (88% vh)
      // Completes when header has scrolled to upper viewport (20% vh)
      const start = vh * 0.88;
      const end = vh * 0.20;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));

      // Avoid redundant work if scroll position change is negligible
      if (Math.abs(progress - lastProgress) < 0.0005) return;
      lastProgress = progress;

      const elements = charRefs.current;
      const prevLit = prevLitRef.current;
      const spread = 0.055;

      for (let i = 0; i < totalChars; i++) {
        const span = elements[i];
        if (!span) continue;

        const target = charTargets[i];
        const diff = progress - target;
        let lit = diff / spread + 0.5;
        if (lit < 0) lit = 0;
        else if (lit > 1) lit = 1;

        const prev = prevLit[i];
        // Fast skip for characters already settled at boundaries
        if ((lit === 0 && prev === 0) || (lit === 1 && prev === 1)) {
          continue;
        }

        // Apply style update if state meaningfully changed or settled
        if (Math.abs(lit - prev) >= 0.02 || (lit === 1 && prev !== 1) || (lit === 0 && prev !== 0)) {
          prevLit[i] = lit;
          const crest = Math.sin(lit * Math.PI);
          span.style.setProperty('--lit', lit.toFixed(3));
          span.style.setProperty('--crest', crest.toFixed(3));
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(updateScrollLit);
    };

    updateScrollLit();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [charTargets, totalChars]);

  return (
    <header ref={containerRef} className={`sec-head intro-scroll-lit-head ${isMounted ? 'is-ready' : ''}`}>
      <div className="sec-head-main">
        <h2 className="lines h2 is-in scroll-lit-h2" aria-label={TITLE_LINES.join(' ')}>
          {titleLines.map((lineData, lineIdx) => (
            <span className="line" key={lineIdx}>
              <span aria-hidden="true">
                {lineData.words.map((wData, wIdx) => (
                  <span key={wIdx}>
                    <span className="scroll-lit-word">
                      {wData.charIndices.map((cIdx, charPos) => (
                        <span
                          key={cIdx}
                          ref={(el) => {
                            charRefs.current[cIdx] = el;
                          }}
                          className="scroll-lit-char"
                          style={{ '--lit': '0', '--crest': '0' } as React.CSSProperties}
                        >
                          {wData.word[charPos]}
                        </span>
                      ))}
                    </span>
                    {wIdx < lineData.words.length - 1 ? ' ' : null}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </h2>

        <p className="fade lede is-in scroll-lit-lede" aria-label={LEDE_TEXT}>
          <span aria-hidden="true">
            {ledeWords.map((wData, wIdx) => (
              <span key={wIdx}>
                <span className="scroll-lit-word">
                  {wData.charIndices.map((cIdx, charPos) => (
                    <span
                      key={cIdx}
                      ref={(el) => {
                        charRefs.current[cIdx] = el;
                      }}
                      className="scroll-lit-char"
                      style={{ '--lit': '0', '--crest': '0' } as React.CSSProperties}
                    >
                      {wData.word[charPos]}
                    </span>
                  ))}
                </span>
                {wIdx < ledeWords.length - 1 ? ' ' : null}
              </span>
            ))}
          </span>
        </p>
      </div>
    </header>
  );
}
