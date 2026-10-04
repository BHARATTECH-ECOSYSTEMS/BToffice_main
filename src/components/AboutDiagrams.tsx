import { useState, useEffect } from 'react';

/**
 * Animated Philosophy Diagram
 * Visually illustrates the fundamental paradigm shift from:
 * 1. "Fragmented AI" (isolated models with broken communication and zero shared memory)
 * 2. "Bharattech Origin" (unified cognitive mesh with persistent shared memory & real-time reasoning)
 */
export function PhilosophyDiagram() {
  const [mode, setMode] = useState<'unified' | 'fragmented'>('unified');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let animId: number;
    let start = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      setPulse(elapsed);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="about-philosophy-card">
      <div className="about-card-head">
        <div className="about-card-title-group">
          <span className="about-live-dot" />
          <span className="mono">ARCHITECTURE TELEMETRY</span>
        </div>
        <div className="about-toggle-group">
          <button
            type="button"
            className={`about-toggle-btn ${mode === 'unified' ? 'is-active' : ''}`}
            onClick={() => setMode('unified')}
          >
            Origin Cognitive Mesh
          </button>
          <button
            type="button"
            className={`about-toggle-btn ${mode === 'fragmented' ? 'is-active' : ''}`}
            onClick={() => setMode('fragmented')}
          >
            Fragmented Silos
          </button>
        </div>
      </div>

      <div className="about-canvas-wrap">
        <svg viewBox="0 0 600 320" className="about-diagram-svg" aria-label="Architecture Comparison">
          <defs>
            <linearGradient id="grad-core" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7a5af8" />
              <stop offset="50%" stopColor="#9b51e0" />
              <stop offset="100%" stopColor="#ff7043" />
            </linearGradient>
            <linearGradient id="grad-wire-live" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(122, 90, 248, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 112, 67, 0.9)" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background gridlines */}
          <g className="diagram-grid" opacity="0.15">
            <line x1="40" y1="80" x2="560" y2="80" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="40" y1="160" x2="560" y2="160" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="40" y1="240" x2="560" y2="240" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="150" y1="30" x2="150" y2="290" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="300" y1="30" x2="300" y2="290" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="450" y1="30" x2="450" y2="290" stroke="currentColor" strokeDasharray="3 3" />
          </g>

          {mode === 'unified' ? (
            /* ── UNIFIED ORIGIN COGNITIVE MESH ── */
            <g className="unified-view">
              {/* Outer orbit ring */}
              <circle cx="300" cy="160" r="115" fill="none" stroke="rgba(122, 90, 248, 0.25)" strokeDasharray="4 6" />
              <circle
                cx="300"
                cy="160"
                r="115"
                fill="none"
                stroke="url(#grad-wire-live)"
                strokeWidth="1.5"
                strokeDasharray="60 300"
                strokeDashoffset={-pulse * 85}
              />

              {/* Connecting bus lines from satellites to central core */}
              {[
                { x: 170, y: 80, label: 'Vision' },
                { x: 430, y: 80, label: 'Language' },
                { x: 450, y: 220, label: 'Reasoning' },
                { x: 150, y: 220, label: 'Code & Tools' },
                { x: 300, y: 45, label: 'Sensors / Edge' },
              ].map((node, i) => {
                const packetOffset = ((pulse * 1.2 + i * 0.2) % 1);
                const px = node.x + (300 - node.x) * packetOffset;
                const py = node.y + (160 - node.y) * packetOffset;

                return (
                  <g key={node.label}>
                    {/* Bus wire */}
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2="300"
                      y2="160"
                      stroke="rgba(122, 90, 248, 0.4)"
                      strokeWidth="1.5"
                    />
                    {/* Animated moving data packet */}
                    <circle cx={px} cy={py} r="3" fill="#ff8643" filter="url(#glow)" />

                    {/* Satellite node */}
                    <circle cx={node.x} cy={node.y} r="18" fill="var(--card, #161618)" stroke="rgba(122, 90, 248, 0.6)" strokeWidth="1.5" />
                    <circle cx={node.x} cy={node.y} r="6" fill="#7a5af8" />
                    <text
                      x={node.x}
                      y={node.y + (node.y > 160 ? 32 : -26)}
                      textAnchor="middle"
                      fill="var(--ink, #fff)"
                      fontSize="11"
                      fontFamily="var(--sans)"
                      fontWeight="500"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* Central Persistent Memory Core */}
              <circle
                cx="300"
                cy="160"
                r={44 + Math.sin(pulse * 3) * 2}
                fill="url(#grad-core)"
                opacity="0.18"
                filter="url(#glow)"
              />
              <circle
                cx="300"
                cy="160"
                r="36"
                fill="var(--card, #121214)"
                stroke="url(#grad-core)"
                strokeWidth="2"
              />
              <circle cx="300" cy="160" r="14" fill="url(#grad-core)" />
              <text x="300" y="156" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" letterSpacing="0.05em">
                PERSISTENT
              </text>
              <text x="300" y="169" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="9" fontWeight="500">
                MEMORY BUS
              </text>

              {/* Real-time telemetry badges */}
              <g transform="translate(40, 260)">
                <rect width="135" height="26" rx="13" fill="rgba(34, 197, 94, 0.12)" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1" />
                <circle cx="14" cy="13" r="3.5" fill="#22c55e" />
                <text x="24" y="17" fill="#22c55e" fontSize="10" fontFamily="var(--mono)" fontWeight="600">
                  CONTEXT: 100% PERSISTENT
                </text>
              </g>

              <g transform="translate(425, 260)">
                <rect width="135" height="26" rx="13" fill="rgba(122, 90, 248, 0.12)" stroke="rgba(122, 90, 248, 0.4)" strokeWidth="1" />
                <circle cx="14" cy="13" r="3.5" fill="#7a5af8" />
                <text x="24" y="17" fill="var(--ink, #fff)" fontSize="10" fontFamily="var(--mono)" fontWeight="500">
                  FLOW: MULTI-AGENT MESH
                </text>
              </g>
            </g>
          ) : (
            /* ── FRAGMENTED LEGACY SILOS VIEW ── */
            <g className="fragmented-view">
              {[
                { x: 100, y: 140, label: 'LLM Chat', note: 'Isolated Context' },
                { x: 235, y: 140, label: 'Vision Model', note: 'No Cross-Memory' },
                { x: 370, y: 140, label: 'Code Engine', note: 'Single Session' },
                { x: 505, y: 140, label: 'Search Index', note: 'Zero Continuity' },
              ].map((silo, idx) => (
                <g key={silo.label}>
                  {/* Broken dashed boundary */}
                  <rect
                    x={silo.x - 55}
                    y={silo.y - 65}
                    width="110"
                    height="130"
                    rx="10"
                    fill="rgba(255, 255, 255, 0.02)"
                    stroke="rgba(239, 68, 68, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Severed wire stub */}
                  {idx < 3 && (
                    <g>
                      <line
                        x1={silo.x + 55}
                        y1={silo.y}
                        x2={silo.x + 80}
                        y2={silo.y}
                        stroke="rgba(239, 68, 68, 0.3)"
                        strokeWidth="1.5"
                        strokeDasharray="2 3"
                      />
                      <line
                        x1={silo.x + 75}
                        y1={silo.y - 6}
                        x2={silo.x + 85}
                        y2={silo.y + 6}
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                  {/* Silo node icon */}
                  <circle cx={silo.x} cy={silo.y - 20} r="18" fill="rgba(239, 68, 68, 0.08)" stroke="#ef4444" strokeWidth="1.5" />
                  <circle cx={silo.x} cy={silo.y - 20} r="4" fill="#ef4444" />
                  <text x={silo.x} y={silo.y + 16} textAnchor="middle" fill="var(--ink, #fff)" fontSize="11" fontWeight="600">
                    {silo.label}
                  </text>
                  <text x={silo.x} y={silo.y + 34} textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="var(--mono)">
                    {silo.note}
                  </text>
                </g>
              ))}

              <g transform="translate(180, 260)">
                <rect width="240" height="26" rx="13" fill="rgba(239, 68, 68, 0.12)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
                <circle cx="16" cy="13" r="3.5" fill="#ef4444" />
                <text x="28" y="17" fill="#ef4444" fontSize="10" fontFamily="var(--mono)" fontWeight="600">
                  STATUS: ZERO CONTEXT RETENTION
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="about-card-footer">
        <p className="about-card-caption">
          {mode === 'unified'
            ? 'Unified Origin Engine: Shared knowledge graph persists across all specialized models, creating emergent collective reasoning.'
            : 'Legacy Paradigm: Models are isolated silos. When a session ends, everything learned evaporates into zero.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Interactive Principles Radar Diagram
 * Renders a circular orbital constellation with 6 harmonic nodes
 * synchronized to the currently hovered/selected principle index (0..5).
 */
export function PrinciplesRadar({ activeIndex }: { activeIndex: number | null }) {
  const principles = [
    { title: 'Remember', num: '01', angle: -90 },
    { title: 'Evolve', num: '02', angle: -30 },
    { title: 'Collaborate', num: '03', angle: 30 },
    { title: 'Trustworthy', num: '04', angle: 90 },
    { title: 'Accessible', num: '05', angle: 150 },
    { title: 'Serve', num: '06', angle: 210 },
  ];

  const cx = 170;
  const cy = 170;
  const r = 115;

  return (
    <div className="principles-radar-wrap">
      <svg viewBox="0 0 340 340" className="principles-radar-svg">
        <defs>
          <linearGradient id="p-core-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7a5af8" />
            <stop offset="100%" stopColor="#ff8643" />
          </linearGradient>
          <filter id="p-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer orbital tracks */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line, rgba(255,255,255,0.1))" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke="var(--line, rgba(255,255,255,0.08))" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r * 0.35} fill="none" stroke="var(--line, rgba(255,255,255,0.06))" strokeWidth="1" strokeDasharray="2 4" />

        {/* Central Core Node */}
        <circle cx={cx} cy={cy} r="28" fill="var(--card, #121214)" stroke="url(#p-core-glow)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="10" fill="url(#p-core-glow)" />
        <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize="8" fontFamily="var(--mono)" fontWeight="700">
          AXIOM
        </text>

        {/* Radial connector lines & satellite nodes */}
        {principles.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const nx = cx + r * Math.cos(rad);
          const ny = cy + r * Math.sin(rad);
          const isActive = activeIndex === i;

          return (
            <g key={p.num} className={`radar-node-group ${isActive ? 'is-active' : ''}`}>
              {/* Spoke line */}
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={isActive ? '#ff8643' : 'var(--line, rgba(255,255,255,0.12))'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? 'none' : '3 3'}
              />

              {/* Active laser glow beam */}
              {isActive && (
                <line
                  x1={cx}
                  y1={cy}
                  x2={nx}
                  y2={ny}
                  stroke="#ff8643"
                  strokeWidth="3"
                  filter="url(#p-blur)"
                  opacity="0.6"
                />
              )}

              {/* Outer pulsing ring when active */}
              {isActive && (
                <circle cx={nx} cy={ny} r="18" fill="rgba(255, 134, 67, 0.2)" filter="url(#p-blur)" />
              )}

              {/* Node body */}
              <circle
                cx={nx}
                cy={ny}
                r={isActive ? 12 : 9}
                fill={isActive ? '#ff8643' : 'var(--card, #18181b)'}
                stroke={isActive ? '#ffffff' : 'var(--line-strong, #3f3f46)'}
                strokeWidth="1.5"
                style={{ transition: 'all 0.25s ease' }}
              />

              {/* Node index */}
              <text
                x={nx}
                y={ny + 3.5}
                textAnchor="middle"
                fill={isActive ? '#000' : 'var(--ink-2, #a1a1aa)'}
                fontSize={isActive ? '9' : '8'}
                fontFamily="var(--mono)"
                fontWeight="700"
              >
                {p.num}
              </text>

              {/* Label text */}
              <text
                x={nx + (Math.cos(rad) * 22)}
                y={ny + (Math.sin(rad) * 16) + 4}
                textAnchor={Math.cos(rad) > 0.2 ? 'start' : Math.cos(rad) < -0.2 ? 'end' : 'middle'}
                fill={isActive ? 'var(--accent, #ff8643)' : 'var(--ink-3, #71717a)'}
                fontSize="10"
                fontFamily="var(--sans)"
                fontWeight={isActive ? '600' : '500'}
                style={{ transition: 'all 0.2s ease' }}
              >
                {p.title}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="radar-status-caption">
        <span className="mono">
          {activeIndex !== null
            ? `ACTIVE PRINCIPLE: ${principles[activeIndex].num} · ${principles[activeIndex].title.toUpperCase()}`
            : 'HOVER ANY PRINCIPLE TO ENGAGE ORBITAL TELEMETRY'}
        </span>
      </div>
    </div>
  );
}

/**
 * Stakeholder Category Data for Audience Matrix
 */
export const AUDIENCE_CATEGORIES = [
  {
    id: 'research',
    title: 'Researchers & Scientists',
    badge: 'Science',
    description: 'Literature reviews that run for months, experiments tracked over time, and one memory shared by the whole lab.',
    metric: '400k+ sources synthesized',
    audiences: ['Researchers', 'Scientists', 'Students'],
  },
  {
    id: 'engineering',
    title: 'Developers & Builders',
    badge: 'Building',
    description: 'Build agents and products on one intelligence instead of stitching models together, and deploy them from cloud to edge.',
    metric: '< 2ms neural routing latency',
    audiences: ['Developers', 'Startups', 'Innovators'],
  },
  {
    id: 'enterprise',
    title: 'Enterprises & Organisations',
    badge: 'Organisations',
    description: 'Intelligence that works on your own data, under your own governance, shared across teams instead of locked in tools.',
    metric: '100% data residency guarantee',
    audiences: ['Enterprises'],
  },
  {
    id: 'public',
    title: 'Governments & Institutions',
    badge: 'Public sector',
    description: 'Sovereign deployments for public services, planning, climate and geospatial work, and national security.',
    metric: 'Zero external telemetry leak',
    audiences: ['Governments', 'Educational institutions', 'Defence organisations'],
  },
];
