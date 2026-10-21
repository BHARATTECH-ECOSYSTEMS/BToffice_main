# OpenInterviewer — Project Overview

## What this project is

OpenInterviewer is an open-source web app that lets a researcher (or, in your
case, a hiring team) design a **study** — a set of research questions, topics,
and rules — and then have an **AI conduct one-on-one text interviews** with
any number of participants, entirely on autopilot. Each participant gets a
private link, chats with the AI in a normal chat interface, and when they're
done, the researcher can read the transcript and get an AI-generated
**synthesis** (summary, themes, contradictions) for that one interview, or an
**aggregate synthesis** across every interview in the study.

It is **not** a video-interviewing tool, not a survey-form builder, and not a
generic chatbot — its entire reason to exist is *structured, adaptive,
one-on-one qualitative interviewing at scale*, where the AI adapts its
follow-up questions to what each person actually says, instead of everyone
getting an identical fixed questionnaire.

## The two "sides" of the app

**Researcher side** (`/setup`, `/studies`, `/dashboard`) — password-protected.
This is where you design a study: name it, write a research question, add
core questions (or, as we're now changing it, let the AI generate its own
questions from a job title + description), choose an AI behavior style, and
generate a shareable participant link.

**Participant side** (`/p/[token]`) — no login. Whoever opens the link lands
directly in the chat interview. This is the page that actually talks to the
AI in real time.

## How a single interview flows, technically

1. Researcher clicks **Generate Link** → the app creates a token and saves
   the study's configuration alongside it in MongoDB.
2. Participant opens `/p/<token>` → the app looks that token up in MongoDB to
   confirm it's valid and pull the study config back out.
3. The interview screen shows a **fixed greeting** (not AI-generated) asking
   if they're ready to begin.
4. Once they reply, every message from then on is sent to
   `/api/interview`, which builds a large prompt (see below) and asks the AI
   provider (Gemini, Claude, or Mistral — configurable) what to say next.
5. When the interview naturally wraps up, the transcript is saved, and the
   researcher can trigger a synthesis pass on it.

## The "prompts" folder — the actual brain of the app

Everything about *how the AI behaves* lives in `src/lib/prompts/`. These
aren't fixed scripts — they're instructions that get filled in with your
study's details and sent to the AI, which then generates its own wording
each time:

| File | When it's used | What it controls |
|---|---|---|
| `greeting.ts` | Before the interview starts | Previously generated the opening line via AI; the opening line is now a **fixed sentence** instead (same for every participant), so this file is currently unused by the live flow. |
| `interview.ts` | For every single AI reply during the interview | The main brain — study details, current phase, what questions remain, and all the behavioral rules (one question at a time, dig into mentioned skills/projects, etc). This is the file to edit when you want to change *how questions are asked*. |
| `synthesis.ts` | After an interview ends (or across all interviews) | Instructions for turning a transcript into a structured summary/analysis. |
| `index.ts` | N/A | Just re-exports the functions from the three files above so other files can import them from one place. |

## Where studies and interviews are actually stored

`src/lib/kv.ts` is the single storage layer. It talks to MongoDB (your own
instance, configured via `.env.local`) if available, and otherwise falls back
to a local JSON file for pure local testing. Nearly every read/write to a
study or an interview goes through this one file — it's the right place to
look if something isn't saving, loading, or deleting correctly.

## Key concepts to keep straight

- **Study** — the reusable configuration a researcher builds once (questions,
  topics, AI behavior, etc). One study can produce many interviews.
- **Participant Token** — a single-use-per-participant link tied to one
  study. This is what expires (or doesn't, per your setting) and what the
  participant page checks before letting someone in.
- **Interview** — one completed (or in-progress) transcript from one
  participant, tied back to its study.
- **Synthesis** — an AI-generated analysis, either of one interview or
  aggregated across a whole study's interviews.

## What's changed so far, this session

- Fixed participant links always showing "expired" (the link-creation code
  wasn't saving tokens to the same database the participant page checks).
- Fixed "Create Study" pre-filling the form with the last study you touched
  instead of starting blank.
- Made the greeting a fixed, identical sentence for every participant
  instead of AI-generated, with a system-log note marking when it was shown.
- Removed the restriction that blocked deleting a study once it had
  interviews attached.
- Added `teamName`, `jobTitle`, and `jobRequirements` fields so studies can
  drive AI-generated questions instead of requiring hand-typed ones.
