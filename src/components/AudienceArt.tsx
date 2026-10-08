import type { HueName } from '../gl/palette';

interface AudienceArtProps {
  index: number;
  tone?: HueName;
}

export function AudienceArt({ index }: AudienceArtProps) {
  return (
    <div className="audience-art-container">
      {index === 0 && <ResearchersArt />}
      {index === 1 && <DevelopersArt />}
      {index === 2 && <EnterprisesArt />}
      {index === 3 && <GovernmentsArt />}
      {index === 4 && <EducationArt />}
      {index === 5 && <StartupsArt />}
    </div>
  );
}

// ── Shared SVG Definitions & Styles ──────────────────────────────────────────
function SharedDefs() {
  return (
    <defs>
      <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.06" />
        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0F172A" floodOpacity="0.04" />
      </filter>
      <filter id="pill-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.07" />
        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0F172A" floodOpacity="0.04" />
      </filter>
      <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#818CF8" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="wafer-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
        <stop offset="70%" stopColor="#818CF8" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="radar-beam" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

// ── 0. Researchers: Context Kept · 0% Loss ──────────────────────────────────
function ResearchersArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Dynamic Streaming Dashed Connector Lines */}
      <path d="M 62 48 C 62 82, 142 94, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path d="M 172 48 C 172 76, 174 90, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path d="M 284 48 C 284 82, 208 94, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>

      {/* Live Packets Flowing Continuously along paths into Core */}
      <circle r="3" fill="#6366F1">
        <animateMotion path="M 62 48 C 62 82, 142 94, 175 106" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#6366F1">
        <animateMotion path="M 172 48 C 172 76, 174 90, 175 106" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#6366F1">
        <animateMotion path="M 284 48 C 284 82, 208 94, 175 106" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Isometric Glass/Memory Platform */}
      <g transform="translate(175, 118)">
        {/* Soft Violet Under-Glow with Breathing Pulse */}
        <ellipse cx="0" cy="4" rx="66" ry="24" fill="url(#wafer-glow)">
          <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Lower Base Rim */}
        <polygon points="-58,0 0,23 58,0 0,-23" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.2" />

        {/* 3D Vertical Extrusion */}
        <polygon points="-58,0 0,23 0,28 -58,5" fill="#C7D2FE" />
        <polygon points="0,23 58,0 58,5 0,28" fill="#A5B4FC" />

        {/* Upper White Platform */}
        <polygon points="-58,-4 0,19 58,-4 0,-27" fill="#FFFFFF" stroke="#818CF8" strokeWidth="1.5" />

        {/* Central Glowing Purple Diamond */}
        <polygon points="-12,-4 0,1 12,-4 0,-9" fill="#6366F1" />
        <polygon points="-6,-4 0,-1 6,-4 0,-7" fill="#818CF8" />
      </g>

      {/* Top Floating Badges */}
      {/* Badge 1: Study 24-B */}
      <g transform="translate(14, 14)" filter="url(#card-shadow)">
        <rect width="94" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Study 24-B
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          1.4k papers
        </text>
      </g>

      {/* Badge 2: Hypothesis 03 */}
      <g transform="translate(118, 14)" filter="url(#card-shadow)">
        <rect width="102" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Hypothesis 03
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          7 flagged
        </text>
      </g>

      {/* Badge 3: Live Session (Active Lavender/Violet) */}
      <g transform="translate(230, 14)" filter="url(#card-shadow)">
        <rect width="106" height="34" rx="8" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1.2" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="25" y="16" fill="#5B21B6" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Live Session
        </text>
        <text x="25" y="27" fill="#7C3AED" fontSize="8.5" fontFamily="sans-serif">
          Recall active
        </text>
      </g>

      {/* Bottom Status Pill */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-87" y="-13" width="174" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="-70" cy="0" r="3.5" fill="#10B981" />
        <circle cx="-70" cy="0" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-58" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Context kept · 0% loss
        </text>
      </g>
    </svg>
  );
}

// ── 1. Developers: One memory · All systems ─────────────────────────────────
function DevelopersArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Central Concentric Radar Core */}
      <g transform="translate(175, 96)">
        {/* Glowing Halo */}
        <circle cx="0" cy="0" r="62" fill="url(#hub-glow)" />

        {/* Concentric Coordinate Rings */}
        <circle cx="0" cy="0" r="74" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="0" cy="0" r="52" stroke="#C7D2FE" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="30" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="4 3" />

        {/* Breathing Inner Ring Pulse */}
        <circle cx="0" cy="0" r="30" stroke="#6366F1" strokeWidth="1" opacity="0.4">
          <animate attributeName="r" values="30;38;30" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Radial Coordinate Ticks */}
        <line x1="0" y1="-30" x2="0" y2="-22" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="-15" x2="19" y2="-11" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="15" x2="19" y2="11" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="0" y1="30" x2="0" y2="22" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="-26" y1="15" x2="-19" y2="11" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="-26" y1="-15" x2="-19" y2="-11" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />

        {/* Central Emblem Disc */}
        <circle cx="0" cy="0" r="16" fill="#4F46E5" />
        <circle cx="0" cy="0" r="13" fill="#4338CA" />

        {/* Stacked Layers Emblem */}
        <path
          d="M-6 -3 L0 0 L6 -3 M-6 0 L0 3 L6 0 M-6 3 L0 6 L6 3"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Radial Streaming Dashed Lines */}
      <line x1="175" y1="80" x2="175" y2="40" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="151" y1="82" x2="102" y2="56" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="199" y1="82" x2="248" y2="56" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="151" y1="110" x2="102" y2="132" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="199" y1="110" x2="248" y2="132" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>

      {/* Pulsing Connector Junction Nodes */}
      <circle cx="175" cy="48" r="3" fill="#10B981" />
      <circle cx="122" cy="66" r="3" fill="#10B981" />
      <circle cx="228" cy="66" r="3" fill="#10B981" />
      <circle cx="122" cy="124" r="3" fill="#6366F1" />
      <circle cx="228" cy="124" r="3" fill="#6366F1" />

      {/* Surrounding Floating Badges */}
      {/* Top: </> Code */}
      <g transform="translate(147, 16)" filter="url(#card-shadow)">
        <rect width="56" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="12" y="16" fill="#4F46E5" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">
          &lt;/&gt;
        </text>
        <text x="31" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Code
        </text>
      </g>

      {/* Top-Left: Language */}
      <g transform="translate(20, 44)" filter="url(#card-shadow)">
        <rect width="84" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <path
          d="M12 9 C12 7.5 13.5 6.5 16 6.5 C18.5 6.5 20 7.5 20 9 C20 10.5 18.5 11.5 16 11.5 L14 11.5 L13 13 L13 11.5 C12.5 11.5 12 10.5 12 9 Z"
          stroke="#4F46E5"
          strokeWidth="1.2"
          fill="none"
        />
        <text x="25" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Language
        </text>
      </g>

      {/* Top-Right: Vision */}
      <g transform="translate(246, 44)" filter="url(#card-shadow)">
        <rect width="82" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="15" cy="12" r="4" stroke="#4F46E5" strokeWidth="1.2" />
        <circle cx="15" cy="12" r="1.5" fill="#4F46E5" />
        <text x="25" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Vision
        </text>
      </g>

      {/* Bottom-Left: Research */}
      <g transform="translate(20, 120)" filter="url(#card-shadow)">
        <rect width="86" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <path d="M13 7 L17 7 L17 9 L19 14 C19 15 18.5 16 17 16 L13 16 C11.5 16 11 15 11 14 L13 9 Z" stroke="#4F46E5" strokeWidth="1.2" fill="none" />
        <text x="25" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Research
        </text>
      </g>

      {/* Bottom-Right: Location */}
      <g transform="translate(244, 120)" filter="url(#card-shadow)">
        <rect width="84" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <path d="M15 7 C13.5 7 12.5 8 12.5 9.5 C12.5 11.5 15 15 15 15 C15 15 17.5 11.5 17.5 9.5 C17.5 8 16.5 7 15 7 Z" stroke="#4F46E5" strokeWidth="1.2" fill="none" />
        <circle cx="15" cy="9.5" r="1" fill="#4F46E5" />
        <text x="25" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Location
        </text>
      </g>

      {/* Bottom Status Pill */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-90" y="-13" width="180" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="-73" cy="0" r="3.5" fill="#6366F1" />
        <circle cx="-73" cy="0" r="3.5" fill="#6366F1" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-61" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          One memory · All systems
        </text>
      </g>
    </svg>
  );
}

// ── 2. Enterprises: Zero data egress · 100% governed ────────────────────────
function EnterprisesArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Inflowing Encrypted Connector Streams */}
      <path d="M 62 48 C 62 80, 142 94, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path d="M 172 48 C 172 76, 174 90, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path d="M 284 48 C 284 80, 208 94, 175 106" stroke="#818CF8" strokeWidth="1.6" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>

      {/* Flowing Packets */}
      <circle r="3" fill="#10B981">
        <animateMotion path="M 62 48 C 62 80, 142 94, 175 106" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#10B981">
        <animateMotion path="M 172 48 C 172 76, 174 90, 175 106" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#10B981">
        <animateMotion path="M 284 48 C 284 80, 208 94, 175 106" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Isometric Governance Vault */}
      <g transform="translate(175, 118)">
        {/* Under-Glow Halo */}
        <ellipse cx="0" cy="4" rx="66" ry="24" fill="url(#wafer-glow)">
          <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Pulsing Security Perimeter Ellipse */}
        <ellipse cx="0" cy="2" rx="74" ry="28" stroke="#818CF8" strokeWidth="1" strokeDasharray="3 3">
          <animate attributeName="rx" values="70;78;70" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3.5s" repeatCount="indefinite" />
        </ellipse>

        {/* Base Layer */}
        <polygon points="-58,0 0,23 58,0 0,-23" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.2" />
        <polygon points="-58,0 0,23 0,28 -58,5" fill="#C7D2FE" />
        <polygon points="0,23 58,0 58,5 0,28" fill="#A5B4FC" />

        {/* Secure Top Platform */}
        <polygon points="-42,-6 0,11 42,-6 0,-23" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />

        {/* Central Shield/Lock Emblem */}
        <g transform="translate(0, -6)">
          <path d="M-7 -4 L7 -4 L7 1 C7 6 0 9 0 9 C0 9 -7 6 -7 1 Z" fill="#059669" stroke="#047857" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
      </g>

      {/* Top Floating Badges */}
      {/* Badge 1: VPC Boundary */}
      <g transform="translate(14, 14)" filter="url(#card-shadow)">
        <rect width="96" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          VPC Boundary
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          Isolated subnet
        </text>
      </g>

      {/* Badge 2: SOC2 · ISO */}
      <g transform="translate(118, 14)" filter="url(#card-shadow)">
        <rect width="98" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          SOC2 · ISO
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          Continuous audit
        </text>
      </g>

      {/* Badge 3: Policy Guard (Active Highlight) */}
      <g transform="translate(226, 14)" filter="url(#card-shadow)">
        <rect width="110" height="34" rx="8" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1.2" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="25" y="16" fill="#5B21B6" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Policy Guard
        </text>
        <text x="25" y="27" fill="#7C3AED" fontSize="8.5" fontFamily="sans-serif">
          Zero leak active
        </text>
      </g>

      {/* Bottom Status Pill */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-97" y="-13" width="194" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="-80" cy="0" r="3.5" fill="#10B981" />
        <circle cx="-80" cy="0" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-68" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Zero data egress · 100% governed
        </text>
      </g>
    </svg>
  );
}

// ── 3. Governments: Sovereign core · In-country storage ─────────────────────
function GovernmentsArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Sovereign Radar Sweeper Core */}
      <g transform="translate(175, 96)">
        {/* Glow Halo */}
        <circle cx="0" cy="0" r="64" fill="url(#hub-glow)" />

        {/* Concentric Coordinate Rings */}
        <circle cx="0" cy="0" r="74" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="0" cy="0" r="52" stroke="#C7D2FE" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="28" stroke="#818CF8" strokeWidth="1.4" />

        {/* Coordinate Crosshairs */}
        <line x1="-74" y1="0" x2="74" y2="0" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="0" y1="-74" x2="0" y2="74" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 2" />

        {/* Sweeping 360° Radar Beam */}
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4.2s" repeatCount="indefinite" />
          <line x1="0" y1="0" x2="74" y2="0" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
          <path d="M0 0 L74 0 A74 74 0 0 0 52 -52 Z" fill="url(#radar-beam)" opacity="0.3" />
        </g>

        {/* Center Sovereign Emblem Disc */}
        <circle cx="0" cy="0" r="16" fill="#4338CA" />
        <circle cx="0" cy="0" r="12" fill="#312E81" />
        <circle cx="0" cy="0" r="4.5" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="8" stroke="#818CF8" strokeWidth="1" strokeDasharray="2 2" />
      </g>

      {/* Radial Connector Lines */}
      <line x1="175" y1="78" x2="175" y2="40" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="151" y1="80" x2="102" y2="56" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="199" y1="80" x2="248" y2="56" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="151" y1="110" x2="102" y2="132" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="199" y1="110" x2="248" y2="132" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
      </line>

      {/* Floating Badges */}
      {/* Top: Public AI */}
      <g transform="translate(133, 16)" filter="url(#card-shadow)">
        <rect width="84" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="10" y="16" fill="#4F46E5" fontSize="10">🏛</text>
        <text x="26" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Public AI
        </text>
      </g>

      {/* Top-Left: Sovereign Cloud */}
      <g transform="translate(16, 44)" filter="url(#card-shadow)">
        <rect width="102" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="10" y="16" fill="#4F46E5" fontSize="10">🛡</text>
        <text x="26" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Sovereign Cloud
        </text>
      </g>

      {/* Top-Right: Geospatial */}
      <g transform="translate(232, 44)" filter="url(#card-shadow)">
        <rect width="102" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="10" y="16" fill="#4F46E5" fontSize="10">🛰</text>
        <text x="26" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          Geospatial GIS
        </text>
      </g>

      {/* Bottom-Left: In-Country */}
      <g transform="translate(16, 120)" filter="url(#card-shadow)">
        <rect width="102" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="10" y="16" fill="#4F46E5" fontSize="10">🔒</text>
        <text x="26" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          In-Country Data
        </text>
      </g>

      {/* Bottom-Right: National Audit */}
      <g transform="translate(232, 120)" filter="url(#card-shadow)">
        <rect width="102" height="24" rx="12" fill="#FFFFFF" stroke="#E2E8F0" />
        <text x="10" y="16" fill="#4F46E5" fontSize="10">📋</text>
        <text x="26" y="16" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="sans-serif">
          National Audit
        </text>
      </g>

      {/* Bottom Status Pill */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-97" y="-13" width="194" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="-80" cy="0" r="3.5" fill="#10B981" />
        <circle cx="-80" cy="0" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-68" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Sovereign core · In-country storage
        </text>
      </g>
    </svg>
  );
}

// ── 4. Education: Persistent context · Learns with student ──────────────────
function EducationArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Adaptive Progression Wave with Live Dash Flow */}
      <path
        d="M 44 126 C 94 126, 114 90, 175 90 C 236 90, 252 64, 306 64"
        stroke="#818CF8"
        strokeWidth="2.2"
        strokeDasharray="5 5"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite" />
      </path>

      {/* Live Packet Cruising Continuously along Learning Curve */}
      <circle r="3.5" fill="#6366F1">
        <animateMotion path="M 44 126 C 94 126, 114 90, 175 90 C 236 90, 252 64, 306 64" dur="2.8s" repeatCount="indefinite" />
      </circle>

      {/* Horizontal Milestone Reference Guides */}
      <line x1="40" y1="126" x2="310" y2="126" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="40" y1="90" x2="310" y2="90" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="40" y1="64" x2="310" y2="64" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />

      {/* Stepped Mastery Milestone Nodes */}
      {/* Milestone 1: Foundations */}
      <g transform="translate(80, 126)">
        <circle cx="0" cy="0" r="10" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="4.5" fill="#6366F1" />
        <text x="0" y="20" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="sans-serif">
          Foundations
        </text>
      </g>

      {/* Milestone 2: Reasoning */}
      <g transform="translate(175, 90)">
        <circle cx="0" cy="0" r="12" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="5" fill="#7C3AED" />
        <circle cx="0" cy="0" r="5" fill="#7C3AED" opacity="0.3">
          <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="0" y="22" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="sans-serif">
          Reasoning
        </text>
      </g>

      {/* Milestone 3: Mastery */}
      <g transform="translate(268, 64)">
        <circle cx="0" cy="0" r="14" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="6" fill="#2563EB" />
        <circle cx="0" cy="0" r="6" fill="#2563EB" opacity="0.3">
          <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="0" y="24" fill="#1E40AF" fontSize="8.5" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
          Mastery
        </text>
      </g>

      {/* Top Floating Badges */}
      {/* Badge 1: Student 104 */}
      <g transform="translate(14, 14)" filter="url(#card-shadow)">
        <rect width="94" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Student 104
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          Grade 8 · STEM
        </text>
      </g>

      {/* Badge 2: Adaptive Path */}
      <g transform="translate(118, 14)" filter="url(#card-shadow)">
        <rect width="100" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="14" cy="17" r="3.5" fill="#94A3B8" />
        <text x="25" y="16" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Adaptive Path
        </text>
        <text x="25" y="27" fill="#64748B" fontSize="8.5" fontFamily="sans-serif">
          Auto-paced
        </text>
      </g>

      {/* Badge 3: Offline Voice (Active) */}
      <g transform="translate(228, 14)" filter="url(#card-shadow)">
        <rect width="108" height="34" rx="8" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1.2" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" />
        <circle cx="15" cy="17" r="3.5" fill="#10B981" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="25" y="16" fill="#5B21B6" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Offline Voice
        </text>
        <text x="25" y="27" fill="#7C3AED" fontSize="8.5" fontFamily="sans-serif">
          Local model
        </text>
      </g>

      {/* Bottom Status Pill */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-98" y="-13" width="196" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="-81" cy="0" r="3.5" fill="#7C3AED" />
        <circle cx="-81" cy="0" r="3.5" fill="#7C3AED" opacity="0.4">
          <animate attributeName="r" values="3.5;9;3.5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="-69" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Persistent context · Learns with student
        </text>
      </g>
    </svg>
  );
}

// ── 5. Startups: Learns through live use (Card 3 in reference image) ─────────
function StartupsArt() {
  return (
    <svg className="audience-svg" viewBox="0 0 350 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />

      {/* Top Pill Badge: DEPLOYED */}
      <g transform="translate(175, 24)" filter="url(#card-shadow)">
        <rect x="-44" y="-11" width="88" height="22" rx="11" fill="#FFFFFF" stroke="#6366F1" strokeWidth="1.2" />
        <circle cx="-29" cy="0" r="3" fill="#6366F1" />
        <circle cx="-29" cy="0" r="3" fill="#6366F1" opacity="0.4">
          <animate attributeName="r" values="3;7;3" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <text x="-21" y="3.5" fill="#4F46E5" fontSize="9.5" fontWeight="700" letterSpacing="0.6" fontFamily="sans-serif">
          DEPLOYED
        </text>
      </g>

      {/* Horizontal Background Grid Guides */}
      <line x1="38" y1="60" x2="312" y2="60" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="38" y1="84" x2="312" y2="84" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="38" y1="108" x2="312" y2="108" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="38" y1="134" x2="312" y2="134" stroke="#CBD5E1" strokeWidth="1.2" />

      {/* Dotted Comparison Line: "Other AI: frozen" */}
      <line x1="38" y1="90" x2="312" y2="90" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 3" />
      <text x="286" y="86" fill="#64748B" fontSize="8" fontWeight="500" textAnchor="end" fontFamily="sans-serif">
        Other AI: frozen
      </text>

      {/* Vertical Phase Divider */}
      <line x1="134" y1="50" x2="134" y2="134" stroke="#818CF8" strokeWidth="1.2" strokeDasharray="2 2" />

      {/* Ascending Vertical Columns (Bar Chart) */}
      {/* Training Phase (Muted Lavender Bars) */}
      <rect x="62" y="116" width="12" height="18" rx="4" fill="#E0E7FF" />
      <rect x="94" y="102" width="12" height="32" rx="4" fill="#C7D2FE" />

      {/* Online Adaptation (Vibrant Royal Purple Bars) */}
      <rect x="152" y="80" width="13" height="54" rx="4" fill="#818CF8" />
      <rect x="184" y="62" width="13" height="72" rx="4" fill="#6366F1" />
      <rect x="216" y="46" width="13" height="88" rx="4" fill="#4F46E5" />
      <rect x="248" y="32" width="13" height="102" rx="4" fill="#4338CA" />

      {/* Phase Sublabels */}
      <text x="84" y="146" fill="#64748B" fontSize="8" textAnchor="middle" fontFamily="sans-serif">
        Training Phase
      </text>
      <text x="199" y="146" fill="#4F46E5" fontSize="8.5" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
        Online Adaptation
      </text>

      {/* Smooth Exponential Learning Curve */}
      <path d="M 48 128 C 108 126, 148 90, 254 38" stroke="#4F46E5" strokeWidth="3.2" strokeLinecap="round" fill="none" />

      {/* Live Glowing Cyan Packet Riding Continuously Along Curve */}
      <circle r="3.5" fill="#06B6D4">
        <animateMotion path="M 48 128 C 108 126, 148 90, 254 38" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Curve Peak Tracker Circle & Animated Ripple Ring */}
      <g transform="translate(254, 38)">
        <circle cx="0" cy="0" r="14" stroke="#4F46E5" strokeWidth="1.2" fill="none" opacity="0.3">
          <animate attributeName="r" values="7;18;7" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="0" r="7.5" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="3" fill="#4F46E5" />
      </g>

      {/* Bottom Status Pill: Learns through live use */}
      <g transform="translate(175, 172)" filter="url(#pill-shadow)">
        <rect x="-89" y="-13" width="178" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" />
        {/* Cycle Icon */}
        <g transform="translate(-72, 0)">
          <path
            d="M-4 -2 A4 4 0 0 1 3 -2 M4 2 A4 4 0 0 1 -3 2"
            stroke="#4F46E5"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          <polygon points="3,-4 5,-2 2,-1" fill="#4F46E5" />
          <polygon points="-3,4 -5,2 -2,1" fill="#4F46E5" />
        </g>
        <text x="-58" y="4" fill="#0F172A" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
          Learns through live use
        </text>
      </g>
    </svg>
  );
}
