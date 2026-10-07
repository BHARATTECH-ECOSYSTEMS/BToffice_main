import { useEffect, useId, useRef } from 'react';
import './PillarAnimation.css';

type Kind = 'remember' | 'connect' | 'learn';

export function PillarAnimation({ kind, label }: { kind: Kind; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    const update = () => el.classList.toggle('is-playing', inView && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={`pillar-animation pillar-animation--${kind}`}
      viewBox="0 0 410 256"
      role="img"
      aria-label={label}
    >
      <defs>
        {/* Subtle background tech grid */}
        <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.75" fill="currentColor" opacity="0.12" />
        </pattern>

        {/* Primary violet-to-cyan gradient */}
        <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--violet)" />
          <stop offset="100%" stopColor="var(--azure)" />
        </linearGradient>

        {/* Shimmer gradient for trajectories */}
        <linearGradient id={`${id}-shimmer`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="var(--azure)" stopOpacity="1" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.9" />
        </linearGradient>

        {/* Area fill under curves */}
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--azure)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.0" />
        </linearGradient>

        {/* Core radial glow */}
        <radialGradient id={`${id}-radial-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.45" />
          <stop offset="60%" stopColor="var(--azure)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>

        {/* Holographic soft glow filter */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Grid Canvas Background */}
      <rect width="410" height="256" fill={`url(#${id}-grid)`} className="pa-bg-grid" />

      {/* ─────────────────────────────────────────────────────────────
          01. IT REMEMBERS: Multi-Session Context Retained Across Time
         ───────────────────────────────────────────────────────────── */}
      {kind === 'remember' && (
        <g className="pa-remember-scene">
          {/* Ambient Memory Glow in Core */}
          <ellipse cx="205" cy="155" rx="140" ry="60" fill={`url(#${id}-radial-glow)`} className="pa-core-glow" />

          {/* Top Session Badges (Time Carrying Over) */}
          <g className="pa-sessions-group">
            {/* Session 01: Monday */}
            <g transform="translate(36, 22)" className="pa-session-node pa-session-1">
              <rect width="102" height="34" rx="8" className="pa-session-card" />
              <circle cx="16" cy="17" r="4.5" className="pa-session-dot" />
              <text x="27" y="15" className="pa-session-title">Session 01</text>
              <text x="27" y="26" className="pa-session-sub">40 districts</text>
            </g>

            {/* Session 02: Thursday */}
            <g transform="translate(154, 22)" className="pa-session-node pa-session-2">
              <rect width="102" height="34" rx="8" className="pa-session-card" />
              <circle cx="16" cy="17" r="4.5" className="pa-session-dot" />
              <text x="27" y="15" className="pa-session-title">Session 02</text>
              <text x="27" y="26" className="pa-session-sub">7 flagged</text>
            </g>

            {/* Active Session: Today */}
            <g transform="translate(272, 22)" className="pa-session-node pa-session-live">
              <rect width="102" height="34" rx="8" className="pa-session-card pa-session-card--active" />
              <circle cx="16" cy="17" r="4.5" className="pa-session-dot pa-session-dot--live" />
              <text x="27" y="15" className="pa-session-title pa-session-title--active">Live Session</text>
              <text x="27" y="26" className="pa-session-sub pa-session-sub--active">Recall active</text>
            </g>
          </g>

          {/* Conduit connection arcs from sessions down to memory vault */}
          <path d="M 87 56 C 87 88 160 105 190 120" className="pa-stream-wire" />
          <path d="M 205 56 C 205 85 205 100 205 120" className="pa-stream-wire" />
          <path d="M 323 56 C 323 88 250 105 220 120" className="pa-stream-wire" />

          {/* Shimmering packets flowing down into memory */}
          <path d="M 87 56 C 87 88 160 105 190 120" className="pa-packet-flow pa-flow-1" />
          <path d="M 205 56 C 205 85 205 100 205 120" className="pa-packet-flow pa-flow-2" />
          
          {/* Upward Context Recall Beam into Active Session */}
          <path d="M 205 130 C 240 115 323 90 323 56" className="pa-recall-beam" />

          {/* Persistent Isometric Universal Memory Strata (Crystals) */}
          <g transform="translate(0, 16)" className="pa-isometric-vault">
            {/* Stratum Layer 3 (Deep History) */}
            <g transform="translate(0, 52)" className="pa-stratum-layer pa-stratum-3">
              <path d="M205 100 L295 140 L205 180 L115 140 Z" className="pa-slab-bg" />
              <path d="M115 140 L205 180 L295 140 L295 148 L205 188 L115 148 Z" className="pa-slab-rim" />
              <path d="M145 140 L205 167 L265 140" className="pa-circuit-line" />
            </g>

            {/* Stratum Layer 2 (Cross-Session Indices) */}
            <g transform="translate(0, 26)" className="pa-stratum-layer pa-stratum-2">
              <path d="M205 100 L295 140 L205 180 L115 140 Z" className="pa-slab-bg" />
              <path d="M115 140 L205 180 L295 140 L295 148 L205 188 L115 148 Z" className="pa-slab-rim" />
              <path d="M140 140 L205 169 L270 140" className="pa-circuit-line" />
            </g>

            {/* Stratum Layer 1 (Hot Active Memory Core) */}
            <g transform="translate(0, 0)" className="pa-stratum-layer pa-stratum-1">
              <path d="M205 100 L295 140 L205 180 L115 140 Z" className="pa-slab-bg pa-slab-bg--active" />
              <path d="M115 140 L205 180 L295 140 L295 148 L205 188 L115 148 Z" className="pa-slab-rim pa-slab-rim--active" />
              
              {/* Central Glowing Memory Core Crystal */}
              <polygon points="205,125 228,138 205,151 182,138" fill={`url(#${id}-gradient)`} className="pa-crystal-core" />
              <circle cx="205" cy="138" r="4.5" fill="#ffffff" className="pa-crystal-spark" filter={`url(#${id}-glow)`} />
            </g>
          </g>

          {/* Standardized Bottom HUD Status Tag */}
          <g transform="translate(205, 226)" className="pa-hud-status">
            <rect x="-85" y="-13" width="170" height="26" rx="13" className="pa-hud-pill" />
            <circle cx="-65" cy="0" r="3.5" className="pa-status-indicator" />
            <text x="-52" y="0" dominantBaseline="central" className="pa-hud-text">Context kept · 0% loss</text>
          </g>
        </g>
      )}

      {/* ─────────────────────────────────────────────────────────────
          02. IT CONNECTS: Multi-Modal Systems Sharing One Unified Mind
         ───────────────────────────────────────────────────────────── */}
      {kind === 'connect' && (
        <g className="pa-connect-scene">
          {/* Orbital Field & Radar Horizon */}
          <ellipse cx="205" cy="126" rx="146" ry="72" className="pa-connect-orbit" />
          <ellipse cx="205" cy="126" rx="84" ry="42" className="pa-connect-orbit pa-orbit-inner" />
          
          {/* Expanding Resonance Waves from Central Memory */}
          <circle cx="205" cy="126" r="24" className="pa-shockwave pa-wave-1" />
          <circle cx="205" cy="126" r="24" className="pa-shockwave pa-wave-2" />

          {/* Interconnect Bus Traces (connecting box ports directly to Hub) */}
          {/* Language Port: (126, 62) to Hub (184, 114) */}
          <path d="M 126 62 Q 155 84 184 114" className="pa-bus-line" />
          <path d="M 126 62 Q 155 84 184 114" className="pa-bus-pulse pa-pulse-lang" />

          {/* Vision Port: (284, 62) to Hub (226, 114) */}
          <path d="M 284 62 Q 255 84 226 114" className="pa-bus-line" />
          <path d="M 284 62 Q 255 84 226 114" className="pa-bus-pulse pa-pulse-vis" />

          {/* Research Port: (126, 190) to Hub (184, 138) */}
          <path d="M 126 190 Q 155 168 184 138" className="pa-bus-line" />
          <path d="M 126 190 Q 155 168 184 138" className="pa-bus-pulse pa-pulse-res" />

          {/* Location Port: (284, 190) to Hub (226, 138) */}
          <path d="M 284 190 Q 255 168 226 138" className="pa-bus-line" />
          <path d="M 284 190 Q 255 168 226 138" className="pa-bus-pulse pa-pulse-loc" />

          {/* Code Port: (205, 48) to Hub (205, 102) */}
          <path d="M 205 48 L 205 102" className="pa-bus-line" />
          <path d="M 205 48 L 205 102" className="pa-bus-pulse pa-pulse-code" />

          {/* ── Specialized Modality Satellites (Generous breathing room) ── */}
          {/* 1. Language Node (x=78, y=58, width 96px) */}
          <g transform="translate(78, 58)" className="pa-node-unit pa-node-lang">
            <rect x="-48" y="-14" width="96" height="28" rx="8" className="pa-node-box" />
            {/* Speech bubble icon */}
            <path d="M-35 -5 h11 a2.5 2.5 0 0 1 2.5 2.5 v3.5 a2.5 2.5 0 0 1 -2.5 2.5 h-5.5 l-3.5 3 v-3 h-2 a2.5 2.5 0 0 1 -2.5 -2.5 v-3.5 a2.5 2.5 0 0 1 2.5 -2.5 z" className="pa-node-icon" />
            <text x="-16" y="0" dominantBaseline="central" className="pa-node-label">Language</text>
            <circle cx="48" cy="4" r="3" className="pa-node-port pa-node-port--active" />
          </g>

          {/* 2. Vision Node (x=332, y=58, width 96px) */}
          <g transform="translate(332, 58)" className="pa-node-unit pa-node-vis">
            <rect x="-48" y="-14" width="96" height="28" rx="8" className="pa-node-box" />
            {/* Aperture / eye icon */}
            <path d="M-22 0 c3 -3.5 7 -3.5 10 0 c-3 3.5 -7 3.5 -10 0 Z" className="pa-node-icon" />
            <circle cx="-17" cy="0" r="1.8" fill="var(--azure)" />
            <text x="-4" y="0" dominantBaseline="central" className="pa-node-label">Vision</text>
            <circle cx="-48" cy="4" r="3" className="pa-node-port pa-node-port--active" />
          </g>

          {/* 3. Research Node (x=78, y=194, width 96px) */}
          <g transform="translate(78, 194)" className="pa-node-unit pa-node-res">
            <rect x="-48" y="-14" width="96" height="28" rx="8" className="pa-node-box" />
            {/* Scientific beaker icon */}
            <path d="M-34 -6 v3.5 l-3.5 6 a1 1 0 0 0 1 1 h8 a1 1 0 0 0 1 -1 l-3.5 -6 v-3.5" className="pa-node-icon" />
            <line x1="-35" y1="-6" x2="-29" y2="-6" className="pa-node-icon" />
            <text x="-16" y="0" dominantBaseline="central" className="pa-node-label">Research</text>
            <circle cx="48" cy="-4" r="3" className="pa-node-port pa-node-port--active" />
          </g>

          {/* 4. Location Node (x=332, y=194, width 96px) */}
          <g transform="translate(332, 194)" className="pa-node-unit pa-node-loc">
            <rect x="-48" y="-14" width="96" height="28" rx="8" className="pa-node-box" />
            {/* Geo pin icon */}
            <path d="M-20 -6 a3.2 3.2 0 0 1 3.2 3.2 c0 2.6 -3.2 6.5 -3.2 6.5 s-3.2 -3.9 -3.2 -6.5 a3.2 3.2 0 0 1 3.2 -3.2 z" className="pa-node-icon" />
            <circle cx="-20" cy="-2.8" r="1.2" fill="var(--azure)" />
            <text x="-6" y="0" dominantBaseline="central" className="pa-node-label">Location</text>
            <circle cx="-48" cy="-4" r="3" className="pa-node-port pa-node-port--active" />
          </g>

          {/* 5. Code Node (x=205, y=34) */}
          <g transform="translate(205, 34)" className="pa-node-unit pa-node-code">
            <rect x="-36" y="-14" width="72" height="28" rx="8" className="pa-node-box" />
            {/* Terminal syntax brackets */}
            <path d="M-24 -3 l-3 3 l3 3 M-16 -3 l3 3 l-3 3" className="pa-node-icon" />
            <text x="-8" y="0" dominantBaseline="central" className="pa-node-label">Code</text>
            <circle cx="0" cy="14" r="3" className="pa-node-port pa-node-port--active" />
          </g>

          {/* ── Central Shared Memory Core ── */}
          <g transform="translate(205, 126)" className="pa-central-hub">
            <circle r="36" className="pa-hub-halo" fill={`url(#${id}-radial-glow)`} />
            <circle r="25" className="pa-hub-shell" />
            <circle r="19" fill={`url(#${id}-gradient)`} className="pa-hub-orb" filter={`url(#${id}-glow)`} />
            {/* Holographic Tri-fold Intelligence Rune */}
            <path d="M-7 -5 L0 -9 L7 -5 L0 -1 Z" fill="#ffffff" opacity="0.9" />
            <path d="M-7 0 L0 4 L7 0 L0 -4 Z" fill="#ffffff" opacity="0.75" />
            <path d="M-7 5 L0 9 L7 5 L0 1 Z" fill="#ffffff" opacity="0.6" />
          </g>

          {/* Standardized Bottom HUD Status Tag */}
          <g transform="translate(205, 226)" className="pa-hud-status">
            <rect x="-85" y="-13" width="170" height="26" rx="13" className="pa-hud-pill" />
            <circle cx="-65" cy="0" r="3.5" className="pa-status-indicator pa-status-indicator--azure" />
            <text x="-52" y="0" dominantBaseline="central" className="pa-hud-text">One memory · All systems</text>
          </g>
        </g>
      )}

      {/* ─────────────────────────────────────────────────────────────
          03. IT KEEPS LEARNING: Online Post-Deploy Learning vs Flatline
         ───────────────────────────────────────────────────────────── */}
      {kind === 'learn' && (
        <g className="pa-learn-scene">
          {/* Coordinate Guide Grid Lines */}
          <line x1="46" y1="184" x2="368" y2="184" className="pa-graph-axis" />
          <line x1="46" y1="140" x2="368" y2="140" className="pa-graph-guide" />
          <line x1="46" y1="96" x2="368" y2="96" className="pa-graph-guide" />
          <line x1="46" y1="52" x2="368" y2="52" className="pa-graph-guide" />

          {/* Capability Equalizer Pillars Along Baseline */}
          <g className="pa-capacity-bars">
            {/* Pre-train pillar bars (stable) */}
            <rect x="68" y="160" width="16" height="24" rx="4" className="pa-eq-bar pa-eq-pre" />
            <rect x="98" y="148" width="16" height="36" rx="4" className="pa-eq-bar pa-eq-pre" />
            <rect x="128" y="136" width="16" height="48" rx="4" className="pa-eq-bar pa-eq-pre" />
            <rect x="158" y="124" width="16" height="60" rx="4" className="pa-eq-bar pa-eq-pre" />

            {/* Post-deploy pillar bars (surging upward dynamically) */}
            <rect x="208" y="104" width="16" height="80" rx="4" className="pa-eq-bar pa-eq-post pa-eq-1" fill={`url(#${id}-gradient)`} />
            <rect x="238" y="88" width="16" height="96" rx="4" className="pa-eq-bar pa-eq-post pa-eq-2" fill={`url(#${id}-gradient)`} />
            <rect x="268" y="72" width="16" height="112" rx="4" className="pa-eq-bar pa-eq-post pa-eq-3" fill={`url(#${id}-gradient)`} />
            <rect x="298" y="56" width="16" height="128" rx="4" className="pa-eq-bar pa-eq-post pa-eq-4" fill={`url(#${id}-gradient)`} />
            <rect x="328" y="44" width="16" height="140" rx="4" className="pa-eq-bar pa-eq-post pa-eq-5" fill={`url(#${id}-gradient)`} />
          </g>

          {/* Area Fill Under Ascending Curve */}
          <path
            d="M 56 168 C 95 164, 135 142, 170 126 C 220 106, 275 70, 350 48 L 350 184 L 56 184 Z"
            fill={`url(#${id}-area)`}
            className="pa-curve-area"
          />

          {/* Vertical "DEPLOYED" Demarcation Beacon (x = 170) */}
          <g className="pa-deploy-threshold">
            <line x1="170" y1="36" x2="170" y2="184" className="pa-deploy-line" />
            <g transform="translate(170, 30)">
              <rect x="-38" y="-12" width="76" height="20" rx="6" className="pa-deploy-pill" />
              <circle cx="-26" cy="-2" r="3" className="pa-deploy-beacon" />
              <text x="-16" y="2" className="pa-deploy-text">DEPLOYED</text>
            </g>
          </g>

          {/* Path 1: Pre-training common curve */}
          <path
            d="M 56 168 C 95 164, 135 142, 170 126"
            className="pa-train-curve"
          />

          {/* Path 2: Traditional Model (Stagnates flat post-deploy) */}
          <path
            d="M 170 126 L 362 126"
            className="pa-frozen-flatline"
          />
          <text x="362" y="118" textAnchor="end" className="pa-frozen-label">Other AI: frozen</text>

          {/* Path 3: Bharattech Origin (Continuous Upward Learning) */}
          <path
            d="M 56 168 C 95 164, 135 142, 170 126 C 220 106, 275 70, 350 48"
            className="pa-learning-curve"
            stroke={`url(#${id}-shimmer)`}
          />

          {/* Dynamic Influx Sparkles: Live Experience Arriving on Curve */}
          <g transform="translate(224, 108)">
            <circle r="4" className="pa-experience-spark pa-spark-1" filter={`url(#${id}-glow)`} />
            <circle r="8" className="pa-spark-ripple pa-ripple-1" />
          </g>
          <g transform="translate(286, 76)">
            <circle r="4.5" className="pa-experience-spark pa-spark-2" filter={`url(#${id}-glow)`} />
            <circle r="9" className="pa-spark-ripple pa-ripple-2" />
          </g>

          {/* Apex Leading Energy Head at the End of the Curve */}
          <g transform="translate(352, 48)" className="pa-apex-tracker">
            <circle r="9" className="pa-apex-ring" />
            <circle r="4" fill="#ffffff" filter={`url(#${id}-glow)`} />
          </g>

          {/* Phase Labels on Axis (Clean separation above HUD pill) */}
          <text x="68" y="198" className="pa-axis-label">Training Phase</text>
          <text x="344" y="198" textAnchor="end" className="pa-axis-label pa-axis-label--active">Online Adaptation</text>

          {/* Standardized Bottom HUD Status Tag */}
          <g transform="translate(205, 226)" className="pa-hud-status">
            <rect x="-85" y="-13" width="170" height="26" rx="13" className="pa-hud-pill" />
            {/* Dedicated group prevents CSS rotate from overwriting translation */}
            <g transform="translate(-65, 0)">
              <g className="pa-spin-cycle">
                <circle r="4.5" fill="none" stroke="var(--azure)" strokeWidth="1.5" strokeDasharray="6 4" />
              </g>
            </g>
            <text x="-52" y="0" dominantBaseline="central" className="pa-hud-text">Learns through live use</text>
          </g>
        </g>
      )}
    </svg>
  );
}
