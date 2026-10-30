# OpenInterviewer

Open-source AI-powered qualitative research interview platform. Conduct deep, nuanced interviews at scale with AI interviewers that adapt their style based on participant responses.

## Features

- **AI-Powered Interviews**: Configurable AI interviewer with structured, standard, or exploratory modes
- **Profile Extraction**: Automatically gather participant demographic information during natural conversation
- **Multi-Question Support**: Define core research questions that the AI weaves into conversation naturally
- **Study Management**: Save, edit, and manage multiple studies from the dashboard
- **Real-time Analysis**: Automatic synthesis of stated vs revealed preferences, themes, and contradictions
- **Aggregate Synthesis**: Cross-interview analysis to identify patterns across all participants
- **Follow-up Studies**: Generate new studies based on synthesis findings
- **Secure Deployment**: API keys stay server-side, never exposed to participants

## Deploy Your Own Instance

The AI runs on [Groq](https://console.groq.com/keys). Set these environment variables wherever the app runs:

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for interviews and summaries |
| `ADMIN_PASSWORD` | Yes | Password to protect researcher dashboard |
| `GROQ_MODEL` | No | Model for studies that don't pick one (default `openai/gpt-oss-120b`) |

## How It Works

### For Researchers

1. **Setup Study** (`/setup`): Configure your research questions, profile fields, and AI behavior
2. **Save Study**: Studies are saved to your dashboard for reuse and editing
3. **Generate Link**: Create a shareable participant link with your study configuration embedded
4. **Share**: Distribute the link to participants via email, survey tools, or social media
5. **View Results** (`/dashboard`): Access individual transcripts and per-interview synthesis
6. **Aggregate Analysis**: View cross-interview patterns, themes, and divergent views
7. **Generate Follow-ups**: Create new studies based on synthesis findings to dig deeper

### For Participants

1. **Click Link**: Participants visit the shared URL
2. **Consent**: Read study information and consent to participate
3. **Interview**: Chat naturally with the AI interviewer
4. **Complete**: View summary and thank you message

### Data Flow

```text
Researcher                          Participant
    │                                    │
    ├── Setup Study                      │
    ├── Save to Dashboard                │
    ├── Generate Link ──────────────────►│
    │                                    ├── Consent
    │                                    ├── Interview
    │                                    │       ↓
    │                                    │   AI Interviewer (Groq)
    │                                    │       ↓
    │                                    └── Complete
    │                                           ↓
    │◄───────────────────────────── MongoDB (Storage)
    │
    ├── View Individual Synthesis
    ├── Run Aggregate Analysis
    └── Generate Follow-up Studies
```

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Build for production
npm run build
```

### Development without MongoDB

The app can fall back to `.data/local-store.json` during local development if MongoDB is unavailable. This is intended only for local testing.

To require MongoDB and disable the local fallback, add this to `.env.local`:

```bash
LOCAL_FILE_STORAGE=false
```

## Storage Setup (MongoDB Atlas)

OpenInterviewer uses MongoDB to persist studies, participant links, and interview data.

### Setting Up MongoDB

**Step 1: Create or open a MongoDB Atlas cluster**

1. Go to your [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Open your project and cluster
3. Click **"Connect"**
4. Choose **"Drivers"**
5. Copy the full `mongodb+srv://...` connection string
6. Add your database username and password
7. Add your current IP address in **Network Access**

**Step 2: Configure the app**

Add the full connection string to `.env.local`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.example.mongodb.net/openinterviewer?retryWrites=true&w=majority
```

**Step 3: Verify**



1. Visit your app and log in
2. Create and save a study
3. Navigate to "My Studies" - the study should now appear!

### Environment Variables

- `MONGODB_URI`

## Demo Data

To explore the full platform workflow without running actual interviews, you can load demo data:

### Loading Demo Data

1. Log in to your researcher dashboard
2. Navigate to **My Studies** (`/studies`)
3. Click **"Load Demo"** button (purple button in header)
4. Or, if no studies exist, click **"Load Demo Data"** in the empty state

### What's Included

The demo includes:

- **1 Demo Study**: "The Adaptive Self: Professional Identity in the Age of AI"
  - 5 core research questions about AI impact on professional identity
  - Profile schema: role, AI usage frequency, comfort level, industry
  - AI reasoning enabled for synthesis

- **3 Complete Interviews**:
  - **Sarah** (Product Manager) - Enthusiastic AI adopter, found new strategic role
  - **Marcus** (UX Designer) - Initial skeptic turned converted user
  - **Priya** (Content Manager) - Efficiency vs authenticity tension

- **Full Analysis**: Each interview includes synthesis with themes, contradictions, and insights

### Exploring Features

With demo data loaded, you can:

1. **View Individual Interviews**: Click any interview to see full transcript
2. **Per-Interview Synthesis**: See stated vs revealed preferences, themes
3. **Aggregate Analysis**: Run cross-interview analysis to see patterns
4. **Follow-up Studies**: Generate new studies based on findings

### Clearing Demo Data

Click **"Clear Demo"** (amber button in header) to remove all demo data and start fresh.

## Project Structure

```text
/src
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes (server-side)
│   │   ├── interview/        # AI interview generation
│   │   ├── greeting/         # Interview greeting
│   │   ├── synthesis/        # Individual + aggregate analysis
│   │   ├── studies/          # Study CRUD operations
│   │   ├── generate-link/    # Participant URL generation
│   │   ├── interviews/       # Interview CRUD + export
│   │   ├── auth/             # Authentication
│   │   └── config/           # API key status check
│   ├── setup/                # Study configuration
│   ├── consent/              # Participant consent
│   ├── interview/            # Interview chat
│   ├── synthesis/            # Analysis view
│   ├── export/               # Data export
│   ├── dashboard/            # Researcher dashboard
│   ├── studies/              # Study list + detail views
│   ├── login/                # Researcher login
│   └── p/[token]/            # Participant entry point
├── components/               # React components
├── hooks/                    # Custom React hooks
├── lib/                      # Server-side utilities
│   ├── ai.ts                 # AI provider abstraction
│   ├── providers/            # Groq implementation
│   └── kv.ts                 # MongoDB-backed storage API
├── utils/                    # Client-side utilities
├── services/                 # Client-side services
├── store.ts                  # Zustand state management
├── types.ts                  # TypeScript types
└── middleware.ts             # Auth protection
```

## AI Configuration

Every study runs on Groq: interview turns, the per-interview summary, the cross-interview summary and follow-up studies. Groq's API takes OpenAI-style chat messages, so the app calls it directly (`src/lib/providers/groq.ts`, no SDK).

### Model Selection

1. **Per-study (UI)**: pick a model in Study Setup
2. **Server default**: `GROQ_MODEL`, else `openai/gpt-oss-120b`

| Model | Description |
|-------|-------------|
| `openai/gpt-oss-120b` | Most capable (default) |
| `openai/gpt-oss-20b` | Faster, lighter |
| `qwen/qwen3.8-27b` | Alibaba Cloud model |

A study saved before the switch to Groq (with Gemini, Claude or Mistral) runs on the server default. Check [Groq's model list](https://console.groq.com/docs/models) before setting `GROQ_MODEL` to another model.

If a request fails or takes too long, an interview turn falls back to a neutral follow-up line and a summary to one built from the transcript, so an interview never stops on an AI error.

## Configuring API Keys

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Powers AI interviews and summaries (server-side) |
| `ADMIN_PASSWORD` | Protects researcher dashboard |
| `GROQ_MODEL` | Optional: the default model |
| `SESSION_SECRET` | Separate session signing key |
| `PARTICIPANT_TOKEN_SECRET` | Separate token signing key |

Get a key at the [Groq console](https://console.groq.com/keys).

## Link Management

### Link Expiration

When creating a study, you can set participant links to expire after:

- 7 days
- 30 days
- 90 days
- Never (default)

Expired links show an error message directing participants to request a new link.

### Link Revocation

From the Study Detail page, you can instantly revoke all participant links by toggling "Links Enabled" off. This is useful if:

- You've finished data collection
- You suspect the link has been shared inappropriately
- You need to pause the study temporarily

## Security

### API Key Protection

- **Server-side keys** (`GROQ_API_KEY`): Stored as environment variables, never exposed to browser
- **Participant URLs**: Signed JWT tokens that cannot be tampered with
- **Dashboard**: Password-protected with HTTP-only cookie authentication
- **Data**: Stored in MongoDB Atlas with encrypted connections

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

