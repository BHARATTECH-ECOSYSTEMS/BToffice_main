import { useEffect, useRef, type ReactNode } from 'react';
import type { HueName } from '../gl/palette';
import '../styles/audience-stories.css';

const STORIES = [
  { label: 'KNOWLEDGE WITHOUT SILOS', caption: 'Bring your teams into the same picture. Shared knowledge. Governed access.' },
  { label: 'INTELLIGENCE UNDER YOUR CONTROL', caption: 'Sovereign boundary. Verifiable planning. Every decision leaves an auditable trail.' },
  { label: 'EVERY LEARNER HAS A CONTINUUM', caption: 'Remembered progress shapes next lessons. Voice-first. Across any device.' },
  { label: 'FROM FIRST IDEA TO FIRST RELEASE', caption: 'Built on shared foundation. Modular capabilities. Carry product from cloud to edge.' },
];

function Sheet({ x, y, label, sub, children }: { x: number; y: number; label: string; sub?: string; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`} className="as-sheet-group">
      <rect width="86" height="58" rx="8" className="as-sheet" />
      <text x="10" y="16" className="as-sheet-title">{label}</text>
      {sub && <text x="10" y="27" className="as-sheet-sub">{sub}</text>}
      {children ?? (
        <path d="M10 37 H72 M10 44 H60 M10 51 H66" className="as-rule" />
      )}
    </g>
  );
}

function EnterpriseStory() {
  return (
    <g className="as-story-enterprise">
      {/* Outer Governance Boundary in Pitch Yellow */}
      <rect x="24" y="34" width="312" height="142" rx="14" className="as-boundary" />
      <text x="36" y="48" className="as-boundary-label">ORGANISATION POLICIES · GOVERNED DOMAIN</text>

      {/* Interconnect bus paths between teams */}
      <path d="M72 106 H180 H288 M180 106 V148" className="as-bus-path" />

      {/* Signal flow animations */}
      <circle r="3" className="as-signal-dot">
        <animateMotion dur="2.6s" repeatCount="indefinite" path="M72 106 H180" />
      </circle>
      <circle r="3" className="as-signal-dot">
        <animateMotion dur="2.6s" repeatCount="indefinite" path="M288 106 H180" begin="0.8s" />
      </circle>

      {/* 3 Departmental team sheets (Always visible) */}
      <Sheet x={28} y={76} label="RESEARCH" sub="Studies & IP" />
      <Sheet x={246} y={76} label="OPERATIONS" sub="Pipelines & Data" />

      {/* Central Shared Knowledge & Policy Vault */}
      <g className="as-vault" transform="translate(137, 72)">
        <rect width="86" height="66" rx="10" className="as-vault-sheet" />
        <circle cx="43" cy="23" r="14" className="as-core-halo" />
        <circle cx="43" cy="23" r="9" className="as-core" />
        {/* Shield / lock emblem */}
        <path d="M39 22v-3a4 4 0 0 1 8 0v3m-9 0h10v8H38z" className="as-white-icon" />
        <text x="43" y="47" textAnchor="middle" className="as-vault-title">SHARED VAULT</text>
        <text x="43" y="58" textAnchor="middle" className="as-vault-sub">Zero Silos</text>
      </g>
    </g>
  );
}

function GovernmentStory() {
  return (
    <g className="as-story-government">
      {/* Sovereign territory contour outline */}
      <path
        d="M38 56 L114 44 L175 58 L246 42 L322 54 V152 L244 166 L175 152 L114 166 L38 152 Z"
        className="as-map-contour"
      />
      <path
        d="M114 44 V166 M175 58 V152 M246 42 V166 M38 104 Q180 68 322 104"
        className="as-map-grid"
      />

      {/* National Corridors & Boundary */}
      <rect x="28" y="34" width="304" height="142" rx="14" className="as-boundary" />
      <text x="40" y="48" className="as-boundary-label">SOVEREIGN NATIONAL DATA BOUNDARY</text>

      {/* Public Infrastructure Hubs with harmonious spacing */}
      {[
        { label: 'Public Services', x: 84, y: 84 },
        { label: 'Critical Infra', x: 180, y: 92 },
        { label: 'Geo Planning', x: 276, y: 84 },
      ].map(({ label, x, y }, i) => (
        <g key={label} transform={`translate(${x} ${y})`}>
          <circle r="15" className="as-core-halo" />
          <circle r="7" className="as-core" />
          <text y="21" textAnchor="middle" className="as-hub-label">{label}</text>
          <circle r="2.5" className="as-signal-dot">
            <animate attributeName="r" values="2;8;2" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.7}s`} />
            <animate attributeName="opacity" values="1;0;1" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.7}s`} />
          </circle>
        </g>
      ))}

      {/* Decision Trail Audit Badge - Centered and non-overlapping */}
      <g transform="translate(94, 134)">
        <rect width="172" height="24" rx="12" className="as-audit-pill" />
        <path d="M16 12 L20 16 L27 8" className="as-check-icon" />
        <text x="34" y="15" className="as-audit-text">100% Traceable Decision Trail</text>
      </g>
    </g>
  );
}

function EducationStory() {
  return (
    <g className="as-story-education">
      {/* Background guide rail */}
      <path d="M42 114 C100 114, 110 58, 175 58 S245 118, 280 96 S300 54, 326 54" className="as-continuum-rail" />
      <path d="M42 114 C100 114, 110 58, 175 58 S245 118, 280 96 S300 54, 326 54" className="as-continuum-path" />

      {/* Continuous signal flowing along learning journey */}
      <circle r="4" className="as-signal-dot">
        <animateMotion dur="3.6s" repeatCount="indefinite" path="M42 114 C100 114, 110 58, 175 58 S245 118, 280 96 S300 54, 326 54" />
      </circle>

      {/* Milestones along the continuum */}
      {[
        { label: 'Diagnostic', x: 42, y: 114, done: true, labelOffset: -14 },
        { label: 'Adaptive Study', x: 175, y: 58, done: true, labelOffset: 20 },
        { label: 'Mastery', x: 280, y: 96, done: false, labelOffset: -14 },
      ].map(({ label, x, y, done, labelOffset }) => (
        <g key={label} transform={`translate(${x} ${y})`}>
          <circle r="12" className="as-core-halo" />
          <circle r="6" className={done ? 'as-core' : 'as-core-pending'} />
          {done ? (
            <path d="m-3 0 2 2 4-5" className="as-white-icon" />
          ) : (
            <circle r="2" fill="#fff" />
          )}
          <text y={labelOffset} textAnchor="middle" className="as-hub-label">{label}</text>
        </g>
      ))}

      {/* Synchronized Device Cards (Classroom Hub + Personal Phone) */}
      <g transform="translate(56, 134)">
        <rect width="102" height="32" rx="6" className="as-sheet" />
        <text x="10" y="14" className="as-sheet-title">INSTITUTION</text>
        <text x="10" y="24" className="as-sheet-sub">Curriculum Track</text>
      </g>

      <g transform="translate(204, 134)">
        <rect width="102" height="32" rx="6" className="as-sheet" />
        {/* Audio voice bars */}
        <g transform="translate(12, 12)">
          <line x1="0" y1="3" x2="0" y2="11" className="as-audio-bar">
            <animate attributeName="y1" values="3;0;3" dur="0.8s" repeatCount="indefinite" />
          </line>
          <line x1="4" y1="1" x2="4" y2="13" className="as-audio-bar">
            <animate attributeName="y1" values="1;4;1" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
          </line>
          <line x1="8" y1="4" x2="8" y2="10" className="as-audio-bar">
            <animate attributeName="y1" values="4;0;4" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
          </line>
        </g>
        <text x="28" y="14" className="as-sheet-title">STUDENT DEVICE</text>
        <text x="28" y="24" className="as-sheet-sub">Voice-first sync</text>
      </g>
    </g>
  );
}

function StartupStory() {
  return (
    <g className="as-story-startup">
      {/* 3D Tiered Platform Base */}
      <path d="M70 134 L180 106 L290 134 L180 162 Z" className="as-platform-top" />
      <path d="M70 134 L180 162 V172 L70 144 Z" className="as-platform-side-l" />
      <path d="M290 134 L180 162 V172 L290 144 Z" className="as-platform-side-r" />

      {/* Upward Launch Pathways */}
      <path d="M180 106 V44 M180 106 L76 66 M180 106 L284 66" className="as-bus-path is-dotted" />

      {/* Signal particles launching upward */}
      <circle r="3.5" className="as-signal-dot">
        <animateMotion dur="2.2s" repeatCount="indefinite" path="M180 106 V44" />
      </circle>
      <circle r="3" className="as-signal-dot">
        <animateMotion dur="2.2s" repeatCount="indefinite" path="M180 106 L76 66" begin="0.5s" />
      </circle>
      <circle r="3" className="as-signal-dot">
        <animateMotion dur="2.2s" repeatCount="indefinite" path="M180 106 L284 66" begin="1.1s" />
      </circle>

      {/* Core Product Block */}
      <g transform="translate(132, 40)">
        <rect width="96" height="48" rx="8" className="as-sheet as-core-card" />
        <rect x="8" y="7" width="80" height="12" rx="3" className="as-core-badge" />
        <text x="48" y="16" textAnchor="middle" className="as-core-badge-text">YOUR PRODUCT</text>
        <text x="48" y="30" textAnchor="middle" className="as-sheet-title">Day One Ready</text>
        <text x="48" y="40" textAnchor="middle" className="as-sheet-sub">Shared Core</text>
      </g>

      {/* Endpoints: Cloud API & Edge Market */}
      <g transform="translate(36, 52)">
        <rect width="64" height="30" rx="6" className="as-sheet" />
        <text x="32" y="14" textAnchor="middle" className="as-sheet-title">CLOUD API</text>
        <text x="32" y="24" textAnchor="middle" className="as-sheet-sub">Scale</text>
      </g>

      <g transform="translate(260, 52)">
        <rect width="64" height="30" rx="6" className="as-sheet" />
        <text x="32" y="14" textAnchor="middle" className="as-sheet-title">EDGE DEVICES</text>
        <text x="32" y="24" textAnchor="middle" className="as-sheet-sub">Instant</text>
      </g>
    </g>
  );
}

export function AudienceStory({ index, tone = 'violet' }: { index: number; tone?: HueName }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    const update = () => {
      el.dataset.playing = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const story = STORIES[index] || STORIES[0];

  return (
    <svg
      ref={ref}
      className="audience-story"
      viewBox="0 0 360 206"
      role="img"
      aria-label={story.caption}
      data-playing="true"
      data-tone={tone}
    >
      {/* Background orbital guide */}
      <ellipse cx="180" cy="106" rx="148" ry="70" className="as-orbit" />
      <ellipse cx="180" cy="106" rx="108" ry="48" className="as-orbit as-orbit-inner" />

      {/* Top Section Header */}
      <text x="18" y="20" className="as-label">{story.label}</text>

      {/* Story Visuals */}
      {index === 0 && <EnterpriseStory />}
      {index === 1 && <GovernmentStory />}
      {index === 2 && <EducationStory />}
      {index === 3 && <StartupStory />}

      {/* Bottom Caption */}
      <text x="180" y="190" className="as-caption">
        {story.caption}
      </text>
    </svg>
  );
}
