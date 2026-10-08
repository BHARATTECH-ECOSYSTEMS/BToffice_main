import { useEffect, useRef } from 'react';
import type { HueName } from '../gl/palette';
import '../styles/developer-constellation.css';

export function DeveloperConstellation({ tone = 'tangerine' }: { tone?: HueName }) {
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

  return (
    <svg
      ref={ref}
      className="developer-constellation"
      viewBox="0 0 360 206"
      role="img"
      aria-label="Developer workflow: unified interface connecting memory, reasoning and agents from cloud to edge."
      data-playing="true"
      data-tone={tone}
    >
      {/* Background orbital grid */}
      <ellipse cx="180" cy="106" rx="150" ry="72" className="dc-orbit" />
      <ellipse cx="180" cy="106" rx="110" ry="50" className="dc-orbit dc-orbit-inner" />

      {/* Top Header */}
      <text x="18" y="20" className="dc-label">FROM IDEA TO EVERYWHERE</text>

      {/* Interconnect Bus Routes to Engine Chips & Endpoints */}
      <g className="dc-connections">
        {/* Memory Route (Left) */}
        <path d="M72 82 H38 Q24 82 24 96 V112" className="dc-bus-path" />
        <circle r="3" className="dc-signal-dot">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M72 82 H38 Q24 82 24 96 V112" />
        </circle>

        {/* Reasoning Route (Right) */}
        <path d="M288 82 H322 Q336 82 336 96 V112" className="dc-bus-path" />
        <circle r="3" className="dc-signal-dot">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M288 82 H322 Q336 82 336 96 V112" begin="0.6s" />
        </circle>

        {/* Cloud Route (Top Left) */}
        <path d="M120 46 Q100 24 54 36" className="dc-bus-path is-dotted" />

        {/* Edge Route (Top Right) */}
        <path d="M240 46 Q260 24 306 36" className="dc-bus-path is-dotted" />
      </g>

      {/* Central Developer IDE Window (Always visible, polished, high-contrast) */}
      <g className="dc-editor-window">
        {/* Outer Shadow */}
        <rect x="74" y="44" width="212" height="116" rx="10" className="dc-editor-shadow" />
        {/* Editor Body */}
        <rect x="72" y="42" width="216" height="118" rx="10" className="dc-editor-sheet" />
        {/* Window Title Bar */}
        <path d="M72 66 H288" className="dc-editor-divider" />
        {/* macOS Control Dots */}
        <circle cx="84" cy="54" r="2.5" className="dc-dot dc-dot-red" />
        <circle cx="93" cy="54" r="2.5" className="dc-dot dc-dot-yellow" />
        <circle cx="102" cy="54" r="2.5" className="dc-dot dc-dot-green" />
        {/* File Tab Title */}
        <text x="120" y="57" className="dc-editor-tab">origin-app.ts</text>
        <rect x="234" y="49" width="46" height="11" rx="3" className="dc-live-badge" />
        <text x="257" y="57" textAnchor="middle" className="dc-live-text">SDK ACTIVE</text>

        {/* Real Syntax Highlighted Code with balanced 18px leading */}
        <g className="dc-code-block">
          <text x="86" y="84">
            <tspan className="dc-keyword">import</tspan> {'{ Origin }'} <tspan className="dc-keyword">from</tspan> <tspan className="dc-string">'@bharattech/sdk'</tspan>
          </text>
          <text x="86" y="102">
            <tspan className="dc-keyword">const</tspan> app = <tspan className="dc-keyword">new</tspan> <tspan className="dc-fn">Origin</tspan>({'{'} memory: <tspan className="dc-bool">true</tspan> {'}'})
          </text>
          <text x="86" y="120">
            <tspan className="dc-keyword">await</tspan> app.<tspan className="dc-fn">deploy</tspan>(['<tspan className="dc-string">cloud</tspan>', '<tspan className="dc-string">edge</tspan>'])
          </text>
          <rect x="258" y="110" width="2" height="12" className="dc-cursor" />
        </g>

        {/* Progress Compile Bar */}
        <rect x="86" y="138" width="188" height="4" rx="2" className="dc-compile-bg" />
        <rect x="86" y="138" width="188" height="4" rx="2" className="dc-compile-fill" />
      </g>

      {/* Modular Intelligence Engine Chips on Sides */}
      {/* Memory Engine Chip (Left) */}
      <g className="dc-module dc-module-left" transform="translate(14, 110)">
        <rect width="66" height="34" rx="6" className="dc-mod-sheet" />
        <rect x="6" y="6" width="18" height="22" rx="3" className="dc-mod-icon-bg" />
        <path d="M10 11H20 M10 17H20 M10 23H20" className="dc-mod-icon" />
        <text x="30" y="17" className="dc-mod-title">Memory</text>
        <text x="30" y="27" className="dc-mod-sub">Preserved</text>
      </g>

      {/* Reasoning Engine Chip (Right) */}
      <g className="dc-module dc-module-right" transform="translate(280, 110)">
        <rect width="66" height="34" rx="6" className="dc-mod-sheet" />
        <rect x="6" y="6" width="18" height="22" rx="3" className="dc-mod-icon-bg" />
        <path d="m15 11 4 6-4 6-4-6z" className="dc-mod-icon" />
        <text x="30" y="17" className="dc-mod-title">Reasoning</text>
        <text x="30" y="27" className="dc-mod-sub">Multi-step</text>
      </g>

      {/* Cloud & Edge Deploy Targets (Top corners) */}
      {/* Cloud Node */}
      <g className="dc-target dc-target-cloud" transform="translate(36, 24)">
        <path d="M12 24h24c8 0 8-12 1-13-1-11-16-12-19-3-9-2-14 12-6 16Z" className="dc-target-sheet" />
        <text x="24" y="34" textAnchor="middle" className="dc-target-label">Cloud</text>
      </g>

      {/* Edge/Phone Node */}
      <g className="dc-target dc-target-edge" transform="translate(300, 22)">
        <rect x="2" y="0" width="18" height="28" rx="4" className="dc-target-sheet" />
        <circle cx="11" cy="23" r="1.5" className="dc-dot" />
        <text x="11" y="36" textAnchor="middle" className="dc-target-label">Edge</text>
      </g>

      {/* Bottom Footer Caption */}
      <text x="180" y="190" className="dc-caption">
        One interface. Shared intelligence. Deploy same context anywhere.
      </text>
    </svg>
  );
}
