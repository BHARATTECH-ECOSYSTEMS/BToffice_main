// All site copy lives here so the story can be edited without touching layout.

import type { HueName } from './gl/palette';

export const EMAIL = 'hello@bharattechorigin.com';
/** Gmail's compose window, addressed to `to`: the site's email links open this in a new tab instead of a mail app. */
export const gmailCompose = (to: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`;
export const EMAIL_HREF = gmailCompose(EMAIL);
export const PRIVACY_EMAIL = 'privacy@bharattechorigin.com';

const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const EMPLOYEE_LOGIN_URL = isLocal
  ? 'http://localhost:5173/login'
  : 'https://learning-management-frontend-v1nx.onrender.com/login';

export const LINKEDIN_URL = 'https://www.linkedin.com/company/bharattech/posts/';

export const PROBLEMS = [
  {
    title: 'It forgets.',
    body: 'Every session starts from zero. Three weeks later, the groundwater study and its 7 flagged districts are gone.',
    caption: 'Context retained',
  },
  {
    title: 'It is fragmented.',
    body: 'Survey notes in documents, satellite data in a GIS tool, the discussion in chat. None of them share what they know.',
    caption: '6 tools · 0 shared memory',
  },
  {
    title: 'It stops learning.',
    body: 'The model was trained before the new imagery existed. The water table kept falling; what it knows did not move.',
    caption: 'Frozen at training time',
  },
  {
    title: 'It works alone.',
    body: 'Each tool reaches for the others and falls short, so the team copies data between them by hand.',
    caption: '0 of 7 connections complete',
  },
];

// Order matters: each group of five sits on one orbital ring, inner to outer.
export const CAPABILITY_GROUPS = ['Understand', 'Build', 'Operate'];
export const CAPABILITIES = [
  { name: 'Deep Research', body: 'Long-horizon investigation across sources, with memory of every step.' },
  { name: 'AI Search', body: 'Retrieval that understands intent, not just keywords.' },
  { name: 'Knowledge Memory', body: 'Persistent, structured memory that compounds with every interaction.' },
  { name: 'Vision Intelligence', body: 'Perception across images, documents, video and the physical world.' },
  { name: 'Voice Intelligence', body: 'Natural, real-time speech understanding and response.' },
  { name: 'Agent Builder', body: 'Compose autonomous agents that inherit everything the system knows.' },
  { name: 'Workflow Builder', body: 'Turn repeated work into reliable, observable automation.' },
  { name: 'AI Studio', body: 'Design, test and tune intelligent behaviour without friction.' },
  { name: 'Developer APIs', body: 'Every capability, exposed as a clean interface.' },
  { name: 'Model Deployment', body: 'Host and serve models anywhere, from cloud to edge.' },
  { name: 'Workspace', body: 'A shared surface where people and intelligence work side by side.' },
  { name: 'Browser', body: 'The web, read and navigated with context.' },
  { name: 'Enterprise Intelligence', body: 'Organisation-wide intelligence on your own data, under your governance.' },
  { name: 'Security', body: 'Trust and isolation designed into every layer, never bolted on.' },
  { name: 'Marketplace', body: 'A shared ecosystem of agents, models and workflows.' },
];

/** Nine layers, top to bottom. `trace` is what each one does for the groundwater request in the scenario. */
export const LAYERS = [
  { name: 'Applications', body: 'Where people and organisations meet the intelligence.', trace: 'The team asks from its study workspace: “Which districts did we flag as critical?”' },
  { name: 'Reasoning Engine', body: 'Plans, infers and decides across many steps.', trace: 'Plans three steps: recall the study, check the new imagery, draft a brief.' },
  { name: 'Memory Engine', body: 'Retains context across sessions, agents and time.', trace: 'Recalls the study from three weeks ago and its 7 flagged districts.' },
  { name: 'Knowledge Engine', body: 'Structures what is known into a living graph.', trace: 'Links each district to its aquifer records and the survey notes.' },
  { name: 'Research Engine', body: 'Investigates, verifies and extends that knowledge.', trace: 'Compares the new satellite imagery: decline in 3 of the 7 districts.' },
  { name: 'Security Layer', body: 'Isolation, policy and trust at every boundary.', trace: 'Checks the team may see the survey data; nothing leaves its boundary.' },
  { name: 'Infrastructure Layer', body: 'Orchestration that keeps every capability in sync.', trace: 'Splits the imagery analysis across workers and gathers the results.' },
  { name: 'Compute Layer', body: 'Efficient training and inference, from cluster to edge.', trace: 'Runs the imagery models on accelerators close to the data.' },
  { name: 'Sovereign Cloud', body: 'Data and intelligence that remain under national control.', trace: 'Every step runs, and is stored, on infrastructure inside India.' },
];

export const LAYER_FAMILIES = [
  { name: 'Intelligence', from: 0, to: 2 },
  { name: 'Knowledge & trust', from: 3, to: 5 },
  { name: 'Foundation', from: 6, to: 8 },
];

export const DOMAINS = [
  {
    id: 'gi-rivinity',
    name: 'GI Rivinity',
    field: 'Generative Intelligence',
    body: 'Our flagship programme: an autonomous intelligence model built for continuous learning, long-term memory, reasoning and adaptive decision-making. Unlike conventional LLMs, it is designed to evolve over time while preserving context.',
    focus: ['Continuous learning', 'Long-term memory', 'Autonomous reasoning', 'Adaptive decisions', 'Context preservation'],
  },
  {
    id: 'rivinity-core',
    name: 'Rivinity Core',
    field: 'Universal Intelligence OS',
    body: 'A universal operating layer that orchestrates intelligence across applications, industries and devices. It is the backbone that lets specialised systems work as one.',
    focus: ['Cross-system orchestration', 'Unified capability layer', 'Intelligence routing', 'Multi-model coordination', 'Shared knowledge fabric'],
  },
  {
    id: 'iot-intelligence',
    name: 'IoT Intelligence',
    field: 'Embedded & Physical AI',
    body: 'Intelligence embedded into connected devices, sensors, robotics, industrial automation and smart infrastructure, so environments can think.',
    focus: ['Connected devices', 'Industrial automation', 'Smart infrastructure', 'Sensor fusion', 'Physical-digital systems'],
  },
  {
    id: 'geo-intelligence',
    name: 'Geo Intelligence',
    field: 'Geospatial & Location AI',
    body: 'AI combined with GIS, remote sensing, satellite imagery, climate analysis and transport networks, so intelligence can understand and reason about the physical world.',
    focus: ['Satellite imagery', 'Geospatial reasoning', 'Climate intelligence', 'Transport networks', 'Remote sensing'],
  },
  {
    id: 'defense-intelligence',
    name: 'Defense Intelligence',
    field: 'Secure & Mission-Critical AI',
    body: 'Secure AI architectures for defence, cybersecurity, strategic analysis, autonomous monitoring and mission-critical decision support, trustworthy and resilient by design.',
    focus: ['Secure architecture', 'Cybersecurity', 'Strategic analysis', 'Autonomous monitoring', 'Mission-critical reliability'],
  },
  {
    id: 'miniature-intelligence',
    name: 'Miniature Intelligence',
    field: 'Edge AI & Lightweight Models',
    body: 'Lightweight models that run on laptops, phones, embedded devices and edge hardware. Local by default, still connected to the larger intelligence network.',
    focus: ['Edge deployment', 'On-device inference', 'Low-power AI', 'Connected edge nodes', 'Cross-device intelligence'],
  },
];

export const PRINCIPLES = [
  { title: 'Intelligence should remember.', body: 'Context is never lost. Every interaction and every piece of knowledge persists and compounds.' },
  { title: 'Intelligence should evolve.', body: 'Systems that improve through use, rather than waiting for the next retraining cycle.' },
  { title: 'Intelligence should collaborate.', body: 'Specialised systems sharing knowledge to create capabilities none could achieve alone.' },
  { title: 'Intelligence should remain trustworthy.', body: 'Security, sovereignty and ethics are foundations, not features.' },
  { title: 'Intelligence should be accessible.', body: 'From cloud to edge, available to everyone who needs it.' },
  { title: 'Intelligence should serve humanity.', body: 'Technology exists to amplify human potential. People remain the constant.' },
];

export const TECHNOLOGY = [
  'Artificial Intelligence', 'Generative Intelligence', 'Autonomous Systems', 'Large Language Models', 'Knowledge Systems', 'AI Infrastructure', 'Edge AI',
  'Geospatial Intelligence', 'Intelligent Automation', 'AI Security', 'Developer Platforms', 'Research Infrastructure', 'Human-AI Collaboration',
];

export const VALUES = [
  { title: 'Long-term thinking', body: 'We build infrastructure for decades. Every decision is made on that timeline.' },
  { title: 'Deep craft', body: 'Not just shipping, but shipping right. Quality is the point.' },
  { title: 'Calm confidence', body: 'Precision and clarity over urgency theatre.' },
  { title: 'Mission first', body: 'We build for researchers, governments, developers and students. That purpose leads.' },
];

export const ROLES = [
  { title: 'Research Scientist', focus: 'Generative Intelligence', team: 'GI Rivinity', location: 'Hybrid · India', dept: 'Research' },
  { title: 'Senior ML Engineer', focus: 'Memory Architecture', team: 'Rivinity Core', location: 'Remote · Global', dept: 'Engineering' },
  { title: 'AI Infrastructure Engineer', focus: 'Platform', team: 'Platform', location: 'Hybrid · India', dept: 'Engineering' },
  { title: 'Research Engineer', focus: 'IoT Intelligence', team: 'IoT Intelligence', location: 'Hybrid · India', dept: 'Research' },
  { title: 'Geospatial AI Researcher', focus: 'Geo Intelligence', team: 'Geo Intelligence', location: 'Hybrid · India', dept: 'Research' },
  { title: 'Security AI Researcher', focus: 'Defense Intelligence', team: 'Defense Intelligence', location: 'On-site · India', dept: 'Research' },
  { title: 'Frontend Engineer', focus: 'Developer Platform', team: 'Platform', location: 'Remote · Global', dept: 'Engineering' },
  { title: 'Technical Writer', focus: 'Research Documentation', team: 'Communications', location: 'Remote · Global', dept: 'Operations' },
];

export const POSTS = [
  {
    slug: 'why-ai-must-remember',
    category: 'Research',
    title: 'Why AI systems must remember',
    dek: 'The case for persistent intelligence.',
    excerpt: 'Every conversation with a current AI model begins from zero. We explore why this limitation holds back the potential of artificial intelligence, and how persistent memory changes everything.',
    date: 'June 2026',
    read: '8 min',
  },
  {
    slug: 'generative-intelligence-vs-generative-ai',
    category: 'Research',
    title: 'Generative Intelligence is not Generative AI',
    dek: 'Content versus capability.',
    excerpt: 'Generative AI creates content. Generative Intelligence creates capabilities. Why the distinction matters for the future of intelligent systems.',
    date: 'May 2026',
    read: '6 min',
  },
  {
    slug: 'iot-intelligence-embedded-ai',
    category: 'Technology',
    title: 'Intelligence that lives in the physical world',
    dek: 'The future of embedded AI.',
    excerpt: 'As AI moves beyond screens and servers, intelligence embedded in physical systems will reshape how industries operate. Our IoT Intelligence research explains how.',
    date: 'May 2026',
    read: '7 min',
  },
  {
    slug: 'geo-intelligence-climate-ai',
    category: 'Research',
    title: 'Reasoning at planetary scale',
    dek: 'Geo Intelligence for climate and infrastructure.',
    excerpt: 'Combining geospatial reasoning with AI unlocks new ways to understand satellite imagery, climate patterns and transportation networks at planetary scale.',
    date: 'April 2026',
    read: '9 min',
  },
  {
    slug: 'miniature-intelligence-edge-ai',
    category: 'Technology',
    title: 'Edge AI without compromise',
    dek: 'Miniature Intelligence on your device.',
    excerpt: 'Lightweight models that stay connected to a larger intelligence network bring the power of the cloud to personal devices, without the latency.',
    date: 'April 2026',
    read: '5 min',
  },
  {
    slug: 'bharattech-origin-philosophy',
    category: 'Company',
    title: 'Infrastructure, not applications',
    dek: 'Our founding philosophy.',
    excerpt: 'Why we chose to work on the foundational layer of intelligence rather than the applications built on top of it.',
    date: 'March 2026',
    read: '10 min',
  },
];

export const PRIVACY = [
  ['Information we collect', 'We collect information you provide directly to us, such as when you contact us through our website, subscribe to updates, or apply for a position at Bharattech Origin. This may include your name, email address, organization, and the content of your communications. We also collect limited technical information automatically when you visit our website, including IP address, browser type, and pages visited, solely for security and analytics purposes.'],
  ['How we use your information', 'We use the information we collect to respond to your enquiries, process applications, send requested updates and communications, improve our website and services, and comply with legal obligations. We do not use personal information to train AI models or for any purpose beyond what is described in this policy.'],
  ['Information sharing', 'We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share information with trusted service providers who assist us in operating our website and conducting our business, provided they agree to keep this information confidential. We may disclose information where required by law or to protect the rights, property, or safety of Bharattech Origin, our users, or the public.'],
  ['Data security', 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure. We strive to use commercially acceptable means to protect your information but cannot guarantee its absolute security.'],
  ['Data retention', 'We retain personal information for as long as necessary to fulfill the purposes for which it was collected, including for legal, accounting, or reporting requirements. When information is no longer needed, we securely delete or anonymize it.'],
  ['Your rights', `You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your information. To exercise these rights, please contact us at ${PRIVACY_EMAIL}. We will respond to your request within 30 days.`],
  ['Cookies', 'Our website uses minimal cookies necessary for basic functionality and security. We do not use cookies for advertising or cross-site tracking. You may configure your browser to refuse cookies, though some features of the website may not function as intended.'],
  ['Third-party links', 'Our website may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies before providing any personal information.'],
  ['Changes to this policy', 'We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date. Your continued use of our website after any changes constitutes your acceptance of the revised policy.'],
  ['Contact us', `If you have any questions about this Privacy Policy, please contact us at ${PRIVACY_EMAIL} or write to us at Bharattech Origin, India.`],
] as const;

export const TERMS = [
  [
    "Acceptance of Terms",
    "By accessing or using the Bharattech Origin website (bharattechorigin.com), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website. These terms apply to all visitors, users, and others who access or use the site."
  ],
  [
    "Intellectual Property",
    "All content on this website, including text, graphics, logos, images, research materials, and software, is the property of Bharattech Origin and is protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content without prior written permission from Bharattech Origin."
  ],
  [
    "Use of the Website",
    "You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others. You may not use the site to transmit any harmful, offensive, or unauthorized content; attempt to gain unauthorized access to any system; interfere with the operation of the website; or scrape or harvest information without our consent."
  ],
  [
    "Research & Information",
    "Research information, technical descriptions, and capability statements on this website are provided for informational purposes only. They represent ongoing research initiatives and should not be interpreted as representations of currently available commercial products or services unless explicitly stated. Bharattech Origin reserves the right to modify, discontinue, or evolve any described research area."
  ],
  [
    "Disclaimer of Warranties",
    "The website and its content are provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied. Bharattech Origin does not warrant that the website will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of the website is at your sole risk."
  ],
  [
    "Limitation of Liability",
    "To the maximum extent permitted by law, Bharattech Origin shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this website or its content. Our total liability to you for any claims arising from these terms shall not exceed the amount you have paid to us, if any, in the twelve months preceding the claim."
  ],
  [
    "Links to Third-Party Websites",
    "Our website may contain links to third-party websites for your convenience. We have no control over the content or practices of those sites and accept no responsibility for them. The inclusion of any link does not imply endorsement by Bharattech Origin."
  ],
  [
    "Privacy",
    "Your use of the website is also governed by our Privacy Policy, which is incorporated into these Terms of Service by reference. Please review our Privacy Policy to understand our practices."
  ],
  [
    "Governing Law",
    "These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to conflict of law provisions. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of India."
  ],
  [
    "Changes to Terms",
    "We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website following the posting of revised terms constitutes your acceptance of the changes. We encourage you to review these terms periodically."
  ],
  [
    "Contact",
    "If you have any questions about these Terms of Service, please contact us at legal@bharattechorigin.com."
  ]
] as const;

export const LEGAL_DATE = "June 2026";

// ── Explainers: written for a first-time visitor ─────────────────────────

export const PILLARS_PLAIN = [
  { title: 'It remembers', body: 'Context carries over between sessions, tools and people, instead of starting from zero every time.' },
  { title: 'It connects', body: 'Specialised systems for language, vision, research and location share one memory and work as one.' },
  { title: 'It keeps learning', body: 'It improves through use after it is deployed, rather than waiting for the next training cycle.' },
];

export const FLOW = [
  {
    step: 'Understand',
    body: 'Reads the request in whatever form it arrives: typed, spoken, a document or an image.',
    powered: ['AI Search', 'Voice Intelligence', 'Vision Intelligence'],
    trace: 'Request received: “Which districts did we flag as critical, and has anything changed?”',
  },
  {
    step: 'Recall',
    body: 'Brings back what it already knows about you, your work and the world, so nothing needs repeating.',
    powered: ['Memory Engine', 'Knowledge Engine'],
    trace: 'Found the groundwater study from three weeks ago: notes, data and 7 flagged districts.',
  },
  {
    step: 'Reason',
    body: 'Plans the steps, checks its sources and investigates what is missing before it answers.',
    powered: ['Reasoning Engine', 'Research Engine', 'Geo Intelligence'],
    trace: 'Plan: compare new satellite imagery with the flagged districts. Result: decline in 3 of 7.',
  },
  {
    step: 'Act',
    body: 'Hands the work to specialised agents and workflows, always inside the permissions you set.',
    powered: ['Agent Builder', 'Workflow Builder', 'Security Layer'],
    trace: 'Drafted an updated brief, linked every source and shared it with the study team.',
  },
  {
    step: 'Learn',
    body: 'Keeps what it learned, so the next request starts further ahead than this one did.',
    powered: ['Memory Engine', 'Knowledge Engine'],
    trace: 'Saved the new findings to the study. Next time, it starts from here.',
  },
];

export const AUDIENCE_DETAIL = [
  {
    name: 'Researchers',
    line: 'A research partner that remembers every source, experiment and dead end, and picks up exactly where you left off.',
    uses: [
      'Long-horizon literature reviews & synthesis',
      'Hypotheses & counter-evidence tracked over months',
      'Shared institutional memory for whole research labs',
      'Automated experimental reproducibility audits',
      'Multi-modal cross-study citations & provenance',
      'Continuous hypothesis validation across archives',
    ],
    poweredBy: ['Memory Engine', 'Knowledge Graph', 'Reasoning Cluster'],
  },
  {
    name: 'Developers',
    line: 'Build on one intelligence instead of stitching models together. Memory, reasoning and agents, exposed as clean interfaces.',
    uses: [
      'Clean gRPC & REST developer APIs with typed SDKs',
      'Stateful autonomous agents that inherit live context',
      'Zero-config deployment from cloud to edge hardware',
      'Deterministic tool calling & function execution',
      'Fine-grained tenant isolation & policy enforcement',
      'Real-time observability & distributed execution traces',
    ],
    poweredBy: ['Developer Studio', 'Agent Runtime', 'Edge Engine'],
  },
  {
    name: 'Enterprises',
    line: 'Organisation-wide intelligence on your own data, under your own governance, shared across teams instead of siloed in tools.',
    uses: [
      'Institutional knowledge that outlives individual projects',
      'Observable workflow orchestration & task automation',
      'Hardware-level encryption & zero data leakage',
      'Custom fine-tuned domain models on private corpus',
      'Enterprise SSO, RBAC & SOC2-compliant access logs',
      'Air-gapped on-premise or sovereign VPC deployments',
    ],
    poweredBy: ['Sovereign Core', 'Security Shield', 'Federated Vault'],
  },
  {
    name: 'Governments',
    line: 'Sovereign intelligence for public services, planning and infrastructure, with data that remains under national control.',
    uses: [
      '100% sovereign national compute & data localization',
      'Geospatial intelligence & critical infrastructure planning',
      'Air-gapped high-security defense network integrations',
      'Citizen service delivery across 22+ official languages',
      'Auditable constitutional guardrails & governance rules',
      'Fault-tolerant decentralized mesh for crisis resilience',
    ],
    poweredBy: ['Sovereign Cloud', 'Geo Rivinity', 'Defense AI'],
  },
  {
    name: 'Education',
    line: 'Learning that remembers each student’s progress, for institutions and learners, on the devices they already have.',
    uses: [
      'Persistent memory of each student’s mastery curve',
      'Natural conversational tutoring via multilingual voice',
      'Ultra-lightweight on-device models for low-cost phones',
      'Dynamic curriculum synthesis & prerequisite mapping',
      'Real-time step-by-step problem breakdown & feedback',
      'Offline-first synchronization for rural connectivity',
    ],
    poweredBy: ['Miniature AI', 'Adaptive Graph', 'Voice Engine'],
  },
  {
    name: 'Startups',
    line: 'Start from a foundation, not from scratch. Ship intelligent products on shared infrastructure and a common ecosystem.',
    uses: [
      'Turnkey intelligence infrastructure from day one',
      'Pre-built persistent memory & agentic primitives',
      'Elastic pay-as-you-scale inference and reasoning',
      'Curated ecosystem marketplace of agents & tools',
      'Instant enterprise-grade compliance & security posture',
      'Rapid prototype-to-production CI/CD workflows',
    ],
    poweredBy: ['AI Studio', 'Fast Inference', 'Agent Hub'],
  },
];

export const FAQ = [
  {
    q: 'What does Bharattech Origin do?',
    a: 'We are an Indian deep-technology research and engineering company. We are building an operating system for intelligence: the shared layer that lets AI systems remember context, work together and keep learning, from national data centres down to phones and devices.',
  },
  {
    q: 'What is “Generative Intelligence”?',
    a: 'Generative AI creates content: text, images, code. Generative Intelligence is our term for systems that generate new capabilities. They learn through use, keep memory over time, and combine specialised models to solve problems none of them could solve alone.',
  },
  {
    q: 'How is this different from today’s AI chat assistants?',
    a: 'Assistants are applications; we work one level down, on infrastructure. Most assistants start each session from zero and work alone. Origin is designed so memory persists, knowledge is shared between specialised systems, and learning continues after deployment.',
  },
  {
    q: 'What is Rivinity?',
    a: 'Rivinity is our flagship research programme. GI Rivinity is the intelligence model at its centre. Rivinity Core is the operating layer that connects it to applications, industries and devices.',
  },
  {
    q: 'Can I use it today?',
    a: 'Rivinity is in active research and development, and we share progress in our Services. If you are a researcher, institution or organisation interested in early collaboration, write to us.',
  },
  {
    q: 'What happens to data?',
    a: 'Security and sovereignty are design principles, not features: data and intelligence are meant to stay under the control of the people and organisations they serve. Our privacy policy explains how this website handles information.',
  },
];

// ── Redesign: chapters, tones and page data ──────────────────────────────


/** The home page as a story: curated chapter colors creating a rich visual journey. */
export const CHAPTERS: { id: string; label: string; tone: HueName }[] = [
  { id: 'top', label: 'Origin', tone: 'violet' },
  { id: 'problem', label: 'The problem', tone: 'tangerine' },
  { id: 'promise', label: 'The answer', tone: 'saffron' },
  { id: 'capabilities', label: 'Capabilities', tone: 'violet' },
  { id: 'how', label: 'How it works', tone: 'tangerine' },
  { id: 'architecture', label: 'Architecture', tone: 'saffron' },
  { id: 'network', label: 'Network', tone: 'violet' },
  { id: 'research', label: 'Research', tone: 'tangerine' },
  { id: 'who', label: 'Join us', tone: 'saffron' },
];

export const FLOW_TONES: HueName[] = ['saffron', 'violet', 'tangerine', 'saffron', 'violet'];
export const AUDIENCE_TONES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];
/** Each careers department's colour, on the Careers page and the home page's careers section alike. */
export const DEPT_TONES: Record<string, HueName> = { Research: 'violet', Engineering: 'saffron', Operations: 'tangerine' };

export const NETWORK = [
  { title: 'Sovereign by design', body: 'The core lives in India. Data and intelligence stay under the control of those they serve.', tone: 'tangerine' as HueName },
  { title: 'Cloud to edge', body: 'The same intelligence runs in national data centres and on the phone in your hand.', tone: 'violet' as HueName },
  { title: 'Open to the world', body: 'Conceived in Bharat, engineered to connect to every region and every language.', tone: 'saffron' as HueName },
];

export const HQ = 'Kanpur, Uttar Pradesh, India';
export const HQ_MAP = 'https://maps.google.com/?q=Kanpur,+Uttar+Pradesh,+India';

export const PRODUCTS = ['BharatAI', 'CollegeCue', 'Recag', 'BSearch'];

export const AWARDS = [
  { year: '2023', title: 'Uttar Pradesh Global Investor Summit', body: 'Launch of BSearch by PM Shri Narendra Modi, and recognition among the top technology startups in the state.' },
  { year: '2023', title: 'International Trade Show', body: 'Bharattech represented at the UP International Trade Show 2023.' },
  { year: '2024', title: 'Indian Web Browser Development Challenge', body: 'Bharattech took part in the Indian Web Browser Development Challenge.' },
  { year: '2024', title: 'MeitY Open Challenge Program', body: 'Bharattech took part in the MeitY Open Challenge Program.' },
];

export const CONTACT_NEEDS = ['Research collaboration', 'Enterprise intelligence', 'Foundation models', 'Rivinity & RECAG', 'Fellowships & careers', 'Press & media'];

export const CONTACT_FAQ = [
  { q: 'How do you partner with institutions and enterprises?', a: 'Through joint research programmes, sponsored fellowships with academic institutions, and early-access deployments for teams building on Origin’s intelligence infrastructure.' },
  { q: 'Are you hiring researchers and systems engineers?', a: 'Yes. We look for researchers, systems engineers and mathematicians who would rather spend a decade on the right problem than a quarter on the easy one. See the Careers page for open roles.' },
  { q: 'How quickly will I hear back?', a: 'Every message is read by a member of the team. Expect a considered reply within two working days.' },
];
