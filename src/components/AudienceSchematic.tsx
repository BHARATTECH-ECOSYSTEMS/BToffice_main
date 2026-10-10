import type { HueName } from '../gl/palette';

interface AudienceSchematicProps {
  index: number;
  tone: HueName;
}

export function AudienceSchematic({ index, tone }: AudienceSchematicProps) {
  // Brand color hex mapped from tone
  const color = tone === 'tangerine' ? '#FF8643' : tone === 'saffron' ? '#F59E00' : '#6E58F5';
  const filterId = `wire-glow-${index}`;

  return (
    <div className="svc-schematic" data-tone={tone}>
      <svg
        viewBox="0 0 440 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="svc-schematic__svg"
      >
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── 01: Researchers — AI & ML Neural Constellation (Enhanced Synaptic Signals) ── */}
        {index === 0 && (
          <g className="schematic-anim-group" transform="translate(40, 10)">
            {/* Background connecting lines */}
            <line x1="80" y1="30" x2="160" y2="20" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="80" y1="30" x2="160" y2="60" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="80" y1="30" x2="160" y2="100" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="80" y1="80" x2="160" y2="20" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="80" y1="80" x2="160" y2="60" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="80" y1="80" x2="160" y2="100" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />

            <line x1="160" y1="20" x2="240" y2="40" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="160" y1="20" x2="240" y2="80" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="160" y1="60" x2="240" y2="40" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="160" y1="60" x2="240" y2="80" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="160" y1="100" x2="240" y2="40" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="160" y1="100" x2="240" y2="80" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />

            {/* Glowing active animated synaptic paths */}
            <path
              d="M 80 80 L 160 60 L 240 80"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />
            <path
              d="M 80 30 L 160 60 L 240 40"
              stroke={color}
              strokeOpacity="0.6"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-reverse"
            />

            {/* Continuous Traveling Luminous Data Packets */}
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion path="M 80 80 L 160 60 L 240 80" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill={color} filter={`url(#${filterId})`}>
              <animateMotion path="M 80 30 L 160 60 L 240 40" dur="2.4s" repeatCount="indefinite" />
            </circle>

            {/* Layer 1 Nodes */}
            <circle cx="80" cy="30" r="5" fill="#0A0B14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="6" fill={color} filter={`url(#${filterId})`} />
            <circle cx="80" cy="80" r="2.5" fill="#ffffff" />

            {/* Layer 2 Nodes (With Expanding Breathing Wave around Center Node) */}
            <circle cx="160" cy="20" r="5" fill="#0A0B14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <circle cx="160" cy="60" r="16" stroke={color} strokeWidth="1.2" fill="none">
              <animate attributeName="r" values="8;18;8" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="160" cy="60" r="7.5" fill={color} filter={`url(#${filterId})`} />
            <circle cx="160" cy="60" r="3" fill="#ffffff" />
            <circle cx="160" cy="100" r="5" fill="#0A0B14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />

            {/* Layer 3 Nodes */}
            <circle cx="240" cy="40" r="5.5" fill="#0A0B14" stroke={color} strokeWidth="1.5" />
            <circle cx="240" cy="80" r="6.5" fill={color} filter={`url(#${filterId})`} />
            <circle cx="240" cy="80" r="2.5" fill="#ffffff" />
          </g>
        )}

        {/* ── 02: Developers — Browser Window + Mobile Wireframe (Enhanced Streaming Sync) ── */}
        {index === 1 && (
          <g className="schematic-anim-group" transform="translate(60, 10)">
            {/* Desktop browser window */}
            <rect
              x="50"
              y="15"
              width="135"
              height="88"
              rx="8"
              fill="#0E1222"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
            />
            {/* Window titlebar dots */}
            <circle cx="64" cy="27" r="2.5" fill="rgba(255,255,255,0.7)" />
            <circle cx="73" cy="27" r="2.5" fill="rgba(255,255,255,0.7)" />
            <circle cx="82" cy="27" r="2.5" fill="rgba(255,255,255,0.7)" />

            {/* Internal UI Card Blocks with Code Terminal Line & Cursor */}
            <rect x="62" y="38" width="52" height="34" rx="4" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="68" y1="48" x2="88" y2="48" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="56" x2="98" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round">
              <animate attributeName="x2" values="80;104;80" dur="2s" repeatCount="indefinite" />
            </line>
            <rect x="122" y="38" width="52" height="34" rx="4" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="148" cy="55" r="8" fill={color} fillOpacity="0.2" />
            <circle cx="148" cy="55" r="3.5" fill={color} />

            {/* Mobile Phone Wireframe on the Right */}
            <rect
              x="220"
              y="22"
              width="50"
              height="88"
              rx="10"
              fill="#0E1222"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
            />
            {/* Phone Screen with brand tone fill & Breathing Glow Animation */}
            <rect
              x="226"
              y="32"
              width="38"
              height="48"
              rx="4"
              fill={color}
              filter={`url(#${filterId})`}
            >
              <animate attributeName="fill-opacity" values="0.75;1;0.75" dur="1.8s" repeatCount="indefinite" />
            </rect>
            {/* Phone home indicator bar */}
            <line x1="236" y1="96" x2="254" y2="96" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Dashed connector line between browser and phone */}
            <path
              d="M 174 55 C 195 55, 195 56, 226 56"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />

            {/* Active Data Stream Packet traveling into the Mobile Phone */}
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion path="M 174 55 C 195 55, 195 56, 226 56" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* ── 03: Enterprises — Cloud Server Rack + Shield Vault (Blinking LEDs & Shield Ripple) ── */}
        {index === 2 && (
          <g className="schematic-anim-group" transform="translate(60, 10)">
            {/* Server Rack on Left */}
            <rect x="60" y="18" width="100" height="84" rx="6" fill="#0E1222" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />

            {/* Rack Units with Live Staggered Blinking LEDs */}
            <rect x="70" y="28" width="80" height="16" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="78" cy="36" r="2.5" fill={color}>
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" />
            </circle>
            <circle cx="86" cy="36" r="2.5" fill="#10B981">
              <animate attributeName="opacity" values="1;0.2;1" dur="1.7s" repeatCount="indefinite" />
            </circle>

            <rect x="70" y="52" width="80" height="16" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="78" cy="60" r="2.5" fill={color}>
              <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="86" cy="60" r="2.5" fill="#10B981">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.3s" repeatCount="indefinite" />
            </circle>

            <rect x="70" y="76" width="80" height="16" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="78" cy="84" r="2.5" fill={color}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite" />
            </circle>
            <circle cx="86" cy="84" r="2.5" fill="#10B981">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Expanding Security Shield Perimeter Ring */}
            <circle cx="245" cy="60" r="16" stroke={color} strokeWidth="1.2" fill="none">
              <animate attributeName="r" values="14;28;14" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>

            {/* Shield Vault on Right */}
            <polygon
              points="245,28 275,44 275,76 245,92 215,76 215,44"
              fill="#0E1222"
              stroke={color}
              strokeWidth="2"
              filter={`url(#${filterId})`}
            />
            {/* Inner Lock with Glow */}
            <circle cx="245" cy="56" r="6" fill={color} />
            <path d="M 245 62 L 245 70" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

            {/* Dashed encrypted link */}
            <path
              d="M 160 60 L 215 60"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />

            {/* Encrypted Data Packet in Flight */}
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion path="M 160 60 L 215 60" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* ── 04: Governments — Sovereign Radar & Orbital Mesh (Rotating Sweep & Satellite Ripples) ── */}
        {index === 3 && (
          <g className="schematic-anim-group" transform="translate(60, 10)">
            {/* Concentric radar rings */}
            <circle cx="120" cy="60" r="45" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            <circle cx="120" cy="60" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
            <circle cx="120" cy="60" r="10" fill={color} filter={`url(#${filterId})`} />

            {/* Radar crosshairs */}
            <line x1="60" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="120" y1="5" x2="120" y2="115" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Continuous Rotating Radar Sweep Beam */}
            <line x1="120" y1="60" x2="165" y2="60" stroke={color} strokeWidth="2" filter={`url(#${filterId})`}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 120 60"
                to="360 120 60"
                dur="3.2s"
                repeatCount="indefinite"
              />
            </line>

            {/* Radar Target Blips */}
            <circle cx="140" cy="46" r="3" fill="#ffffff" filter={`url(#${filterId})`}>
              <animate attributeName="opacity" values="0.1;1;0.1" dur="3.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="102" cy="78" r="3" fill={color}>
              <animate attributeName="opacity" values="1;0.1;1" dur="3.2s" repeatCount="indefinite" />
            </circle>

            {/* Satellite Transceiver on Right with Antenna Waves */}
            <rect x="230" y="38" width="44" height="44" rx="8" fill="#0E1222" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <circle cx="252" cy="60" r="8" fill={color} filter={`url(#${filterId})`} />
            <circle cx="252" cy="60" r="3" fill="#ffffff" />
            <line x1="216" y1="60" x2="230" y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
            <line x1="274" y1="60" x2="288" y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

            {/* Radiating Satellite Pulse Arcs */}
            <path d="M 218 50 A 14 14 0 0 0 218 70" stroke={color} strokeWidth="1.5" fill="none">
              <animate attributeName="stroke-opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" />
            </path>

            {/* Orbit trajectory line with moving satellite packet */}
            <path
              d="M 120 15 Q 185 10 252 38"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion path="M 120 15 Q 185 10 252 38" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* ── 05: Education — Digital Tablet & Learning Tree (Ascending Mastery Particles) ── */}
        {index === 4 && (
          <g className="schematic-anim-group" transform="translate(60, 10)">
            {/* Tablet outline on left */}
            <rect x="50" y="16" width="115" height="88" rx="8" fill="#0E1222" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <rect x="62" y="28" width="91" height="64" rx="4" fill="rgba(255,255,255,0.06)" />
            {/* Active stylus interaction pulse */}
            <circle cx="107.5" cy="60" r="10" stroke={color} strokeWidth="1.2" fill="none">
              <animate attributeName="r" values="4;14;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="107.5" cy="60" r="3" fill={color} />
            <circle cx="107.5" cy="98" r="2" fill="rgba(255,255,255,0.5)" />

            {/* Skill tree nodes on right */}
            <circle cx="240" cy="30" r="7.5" fill={color} filter={`url(#${filterId})`}>
              <animate attributeName="r" values="6.5;9;6.5" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="240" cy="30" r="3" fill="#ffffff" />

            <circle cx="215" cy="70" r="5" fill="#0A0B14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <circle cx="265" cy="70" r="6" fill={color} filter={`url(#${filterId})`} />
            <circle cx="240" cy="100" r="5" fill="#0A0B14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />

            <line x1="240" y1="36" x2="215" y2="65" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <line x1="240" y1="36" x2="265" y2="65" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <line x1="215" y1="75" x2="240" y2="95" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <line x1="265" y1="75" x2="240" y2="95" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

            {/* Connection beam with climbing mastery particles */}
            <path
              d="M 153 60 C 175 60, 185 45, 234 32"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion path="M 153 60 C 175 60, 185 45, 234 32" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* ── 06: Startups — AI Studio Console & Orbital Accelerator (High-Velocity Orbit) ── */}
        {index === 5 && (
          <g className="schematic-anim-group" transform="translate(60, 10)">
            {/* Terminal outline on left */}
            <rect x="50" y="20" width="110" height="80" rx="8" fill="#0E1222" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="62" cy="30" r="2" fill="rgba(255,255,255,0.5)" />
            <circle cx="70" cy="30" r="2" fill="rgba(255,255,255,0.5)" />
            <line x1="62" y1="44" x2="100" y2="44" stroke={color} strokeWidth="2" strokeLinecap="round">
              <animate attributeName="x2" values="85;115;85" dur="1.6s" repeatCount="indefinite" />
            </line>
            <line x1="62" y1="56" x2="130" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="62" y1="68" x2="115" y2="68" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Accelerator core on right with pulsing thrust */}
            <ellipse cx="240" cy="60" rx="42" ry="19" transform="rotate(-15 240 60)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
            <polygon points="240,36 256,66 240,60 224,66" fill={color} filter={`url(#${filterId})`}>
              <animate attributeName="transform" type="translate" values="0,0; 0,-2.5; 0,0" dur="0.9s" repeatCount="indefinite" />
            </polygon>
            <circle cx="270" cy="50" r="4.5" fill="#ffffff" filter={`url(#${filterId})`} />

            {/* Orbiting particle racing around track */}
            <circle r="3.5" fill="#ffffff" filter={`url(#${filterId})`}>
              <animateMotion
                path="M 270 50 A 42 19 0 1 1 210 70 A 42 19 0 1 1 270 50"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Launch vector data stream */}
            <path
              d="M 160 60 L 224 60"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-dash-fast"
            />
            <circle r="3" fill={color} filter={`url(#${filterId})`}>
              <animateMotion path="M 160 60 L 224 60" dur="1.1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}
