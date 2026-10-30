import { buildAggregateSynthesisPrompt, buildStepPrompt, getFixedGreeting } from '../prompts';

import {
  StudyConfig,
  InterviewMessage,
  AIInterviewResponse,
  ParticipantProfile,
  SynthesisResult,
  BehaviorData,
  AggregateSynthesisResult
} from '@/types';

import {
  AIProvider,
  InterviewStepOptions,
  defaultInterviewResponse,
  defaultSynthesisResult,
  cleanJSON
} from '../ai';
import { studyModel } from '../aiDefaults';
import { buildScorecard, type ScoredQuestion, type TranscriptPair } from '../scoring';

// Groq runs every interview (owner, 2026-10-28). Its API takes OpenAI-style chat messages, so no SDK is needed.
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
// the summary is written after the candidate has left (interview/complete), so it may take the time scoring every
// answer needs, a rate-limit wait included
const SYNTHESIS_TIMEOUT_MS = 40000;
// an interview turn the candidate waits on; a request still hanging after this is given up (the turn then falls back)
const REQUEST_TIMEOUT_MS = 30000;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Past its tokens-per-minute limit Groq answers 429 and says how long to wait ("Please try again in 727.5ms" / "9.57s").
// A wait up to this long is waited out once, so a busy minute costs the candidate a pause, not a failed turn.
const RATE_LIMIT_MAX_WAIT_MS = 12000;

function rateLimitWait(res: Response, detail: string): number | null {
  const header = Number(res.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const said = detail.match(/try again in ([\d.]+)(ms|s)/i);
  if (!said) return null;
  return Number(said[1]) * (said[2].toLowerCase() === 'ms' ? 1 : 1000);
}

/** One chat completion; the reply's text, or an error that names Groq's status (never the key). */
async function groqChat(apiKey: string, model: string, messages: ChatMessage[], temperature: number, retried = false): Promise<string> {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    // every prompt here asks for JSON; Groq's JSON mode makes it hold to that
    body: JSON.stringify({ model, messages, temperature, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (res.status === 429 && !retried) {
    const detail = await res.text().catch(() => '');
    const wait = rateLimitWait(res, detail);
    if (wait !== null && wait <= RATE_LIMIT_MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, wait + 250));
      return groqChat(apiKey, model, messages, temperature, true);
    }
    throw new Error(`Groq answered 429: ${detail.slice(0, 300)}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Groq answered ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function stringifyInsight(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(stringifyInsight).filter(Boolean).join('; ');
  }

  const record = value as Record<string, unknown>;
  return Object.entries(record)
    .map(([key, entry]) => `${key}: ${stringifyInsight(entry)}`)
    .filter(Boolean)
    .join('; ');
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(stringifyInsight).filter(Boolean);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(stringifyInsight)
      .filter(Boolean);
  }
  return [stringifyInsight(value)].filter(Boolean);
}

function normalizeThemes(value: unknown): SynthesisResult['themes'] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);

  return values.map((item) => {
    if (typeof item === 'string') {
      return {
        theme: item,
        evidence: '',
        frequency: 1
      };
    }

    const record = item as Record<string, unknown>;
    return {
      theme: stringifyInsight(record.theme || record.name || record.title || record.topic),
      evidence: stringifyInsight(record.evidence || record.description || record.summary),
      frequency: Number(record.frequency) || 1
    };
  }).filter(theme => theme.theme);
}

function normalizeBottomLine(value: unknown): string {
  if (!value) return defaultSynthesisResult.bottomLine;
  if (typeof value === 'string') return value;

  const record = value as Record<string, unknown>;
  return stringifyInsight(record.summary || record.bottomLine || record.insight || value);
}

function normalizeSynthesisResult(value: unknown): SynthesisResult {
  const result = (value || {}) as Partial<SynthesisResult> & Record<string, unknown>;

  return {
    statedPreferences: normalizeStringArray(result.statedPreferences),
    revealedPreferences: normalizeStringArray(result.revealedPreferences),
    themes: normalizeThemes(result.themes),
    contradictions: normalizeStringArray(result.contradictions),
    keyInsights: normalizeStringArray(result.keyInsights),
    bottomLine: normalizeBottomLine(result.bottomLine),
    extractedProfile: result.extractedProfile as SynthesisResult['extractedProfile']
  };
}

function deterministicSynthesisResult(
  history: InterviewMessage[],
  studyConfig: StudyConfig,
  participantProfile: ParticipantProfile | null
): SynthesisResult {
  const userAnswers = (history || [])
    .filter(message => message.role === 'user' && message.content)
    .map(message => message.content.trim());
  const combinedAnswers = userAnswers.join(' ').replace(/\s+/g, ' ').trim();
  const evidence = combinedAnswers.slice(0, 260) || 'The participant completed the interview but provided limited detail.';
  const topicSeeds = [
    ...(studyConfig.topicAreas || []),
    ...(studyConfig.coreQuestions || []).slice(0, 3)
  ];
  const uniqueTopics = Array.from(new Set(topicSeeds.map(topic => topic.trim()).filter(Boolean))).slice(0, 5);
  const themes = (uniqueTopics.length ? uniqueTopics : ['Participant experience'])
    .map(topic => ({
      theme: topic,
      evidence,
      frequency: Math.max(1, Math.min(userAnswers.length, 5))
    }));
  const profileFields = participantProfile?.fields || [];
  const profileValue = (key: string) => {
    const match = profileFields.find(field =>
      field.fieldId?.toLowerCase().includes(key) && field.value
    );
    return match?.value || undefined;
  };

  return {
    statedPreferences: userAnswers.slice(0, 3),
    revealedPreferences: [
      'The participant emphasized the areas they chose to describe in most detail.'
    ],
    themes,
    contradictions: [],
    keyInsights: [
      combinedAnswers
        ? `The participant connected the study topic to concrete work experiences: ${combinedAnswers.slice(0, 220)}${combinedAnswers.length > 220 ? '...' : ''}`
        : 'The interview contains limited participant detail and should be reviewed manually.',
      studyConfig.researchQuestion
        ? `Responses should be interpreted against the research question: ${studyConfig.researchQuestion}`
        : 'Responses provide qualitative context for the configured study.'
    ],
    bottomLine: combinedAnswers
      ? `The interview suggests that ${studyConfig.researchQuestion || studyConfig.name} is experienced through practical tradeoffs, participant context, and the specific examples the participant chose to share.`
      : 'The interview completed, but the transcript has limited detail for analysis.',
    extractedProfile: {
      role: profileValue('role'),
      industry: profileValue('industry'),
      ai_frequency: profileValue('frequency'),
      comfort_level: profileValue('comfort'),
      years_experience: profileValue('experience')
    }
  };
}

function normalizeAggregateThemes(value: unknown): AggregateSynthesisResult['commonThemes'] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);

  return values.map((item) => {
    if (typeof item === 'string') {
      return {
        theme: item,
        frequency: 1,
        representativeQuotes: []
      };
    }

    const record = item as Record<string, unknown>;
    return {
      theme: stringifyInsight(record.theme || record.name || record.title || record.topic),
      frequency: Number(record.frequency) || 1,
      representativeQuotes: normalizeStringArray(record.representativeQuotes || record.quotes || record.evidence)
    };
  }).filter(theme => theme.theme);
}

function normalizeDivergentViews(value: unknown): AggregateSynthesisResult['divergentViews'] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);

  return values.map((item) => {
    const record = typeof item === 'string'
      ? { topic: item, viewA: '', viewB: '' }
      : item as Record<string, unknown>;

    return {
      topic: stringifyInsight(record.topic || record.theme || record.area),
      viewA: stringifyInsight(record.viewA || record.perspectiveA || record.firstView),
      viewB: stringifyInsight(record.viewB || record.perspectiveB || record.secondView)
    };
  }).filter(view => view.topic);
}

function normalizeAggregateResult(value: unknown): Omit<AggregateSynthesisResult, 'studyId' | 'interviewCount' | 'generatedAt'> {
  const result = (value || {}) as Partial<AggregateSynthesisResult> & Record<string, unknown>;

  return {
    commonThemes: normalizeAggregateThemes(result.commonThemes),
    divergentViews: normalizeDivergentViews(result.divergentViews),
    keyFindings: normalizeStringArray(result.keyFindings),
    researchImplications: normalizeStringArray(result.researchImplications),
    bottomLine: normalizeBottomLine(result.bottomLine)
  };
}

function deterministicAggregate(
  studyConfig: StudyConfig,
  syntheses: SynthesisResult[],
  interviewCount: number
): Omit<AggregateSynthesisResult, 'studyId' | 'interviewCount' | 'generatedAt'> {
  const themeCounts = new Map<string, { frequency: number; evidence: string[] }>();
  const findings = new Set<string>();
  const implications = new Set<string>();
  const contradictions = new Set<string>();

  syntheses.forEach((synthesis) => {
    synthesis.themes?.forEach((theme) => {
      if (!theme.theme) return;
      const current = themeCounts.get(theme.theme) || { frequency: 0, evidence: [] };
      current.frequency += Number(theme.frequency) || 1;
      if (theme.evidence) current.evidence.push(theme.evidence);
      themeCounts.set(theme.theme, current);
    });

    synthesis.keyInsights?.forEach((insight) => {
      if (insight && !/analysis pending/i.test(insight)) findings.add(insight);
    });
    synthesis.contradictions?.forEach((contradiction) => {
      if (contradiction) contradictions.add(contradiction);
    });
  });

  if (studyConfig.researchQuestion) {
    implications.add(`The interviews provide evidence for the research question: ${studyConfig.researchQuestion}`);
  }

  const commonThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, 6)
    .map(([theme, data]) => ({
      theme,
      frequency: data.frequency,
      representativeQuotes: data.evidence.slice(0, 3)
    }));

  const divergentViews = Array.from(contradictions)
    .slice(0, 4)
    .map((contradiction) => ({
      topic: 'Tension or contradiction',
      viewA: contradiction,
      viewB: 'Other participants may frame this differently or place less emphasis on it.'
    }));

  const keyFindings = Array.from(findings).slice(0, 8);

  return {
    commonThemes,
    divergentViews,
    keyFindings: keyFindings.length
      ? keyFindings
      : commonThemes.map(theme => `${theme.theme} emerged as a recurring pattern across interviews.`),
    researchImplications: Array.from(implications),
    bottomLine: `Across ${interviewCount} interview${interviewCount === 1 ? '' : 's'}, participants repeatedly surfaced ${commonThemes.slice(0, 3).map(t => t.theme).join(', ') || 'several related themes'}, suggesting that ${studyConfig.researchQuestion || 'the study question'} should be interpreted through both shared patterns and individual tensions.`
  };
}

export class GroqProvider implements AIProvider {

  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY?.trim() || null;
  }

  // ============================================
  // INTERVIEW RESPONSE
  // ============================================

  async generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    step: string,
    options: InterviewStepOptions
  ): Promise<AIInterviewResponse> {

    if (!this.apiKey) {
      console.error("GROQ_API_KEY missing");
      return defaultInterviewResponse;
    }

    try {
      const conversation: ChatMessage[] = (history || [])
        .slice(-12)
        .filter(msg => msg?.content && typeof msg.content === "string")
        .map((msg): ChatMessage => ({
          role: msg.role === "ai" ? "assistant" : "user",
          // a code snippet and its answer must arrive whole, or the next question loses its context
          content: String(msg.content).slice(0, 2000)
        }));

      const raw = await groqChat(
        this.apiKey,
        studyModel(studyConfig),
        [{ role: "system", content: buildStepPrompt(studyConfig, participantProfile, step, options) }, ...conversation],
        // a planted bug wants a steadier hand than a conversational question
        step.startsWith("snippet:") ? 0.4 : 0.2
      );

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJSON(raw));
      } catch {
        console.error("Groq JSON Parse Error:", raw.slice(0, 500));
        return defaultInterviewResponse;
      }

      // NOTE: the message passes through as written: a ```code``` fence inside it is the snippet itself, and route.ts's
      // cleanMessage only unwraps a fence around the WHOLE message.
      const message = typeof parsed?.message === "string" ? parsed.message.trim() : "";
      if (!message) return defaultInterviewResponse;

      const reply: AIInterviewResponse = {
        message,
        answered: parsed.answered !== false,
        profileUpdates: Array.isArray(parsed.profileUpdates)
          ? parsed.profileUpdates.filter(
              (p: any) =>
                p &&
                typeof p.fieldId === "string" &&
                p.fieldId.length > 0 &&
                p.value !== undefined
            )
          : []
      };
      if (typeof parsed.analysis === "string") reply.analysis = parsed.analysis.slice(0, 1500);
      if (Number.isInteger(parsed.plannedQuestions)) reply.plannedQuestions = parsed.plannedQuestions;
      if (parsed.bug && typeof parsed.bug === "object") {
        reply.bug = {
          ...(Number.isInteger(parsed.bug.line) && { line: parsed.bug.line }),
          explanation: String(parsed.bug.explanation ?? "").slice(0, 600),
          fix: String(parsed.bug.fix ?? "").slice(0, 600)
        };
      }
      return reply;

    } catch (error) {
      console.error("Groq Interview Error:", error instanceof Error ? error.message : String(error));
      return defaultInterviewResponse;
    }
  }

  // ============================================
  // GREETING
  // ============================================

  // NOTE: the greeting is now a fixed, hardcoded message (not AI-generated)
  // - see lib/prompts/greeting.ts. /api/greeting/route.ts calls
  // getFixedGreeting() directly and no longer calls this method, but it's
  // kept here (returning the same fixed greeting) to satisfy the
  // AIProvider interface.
  async getInterviewGreeting(studyConfig: StudyConfig): Promise<string> {
    return getFixedGreeting(studyConfig);
  }

  // ============================================
  // RAW RESPONSE
  // ============================================

  async generateRawResponse(extractionPrompt: string): Promise<unknown> {
    if (!this.apiKey) {
      console.error("GROQ_API_KEY missing");
      return null;
    }

    try {
      const raw = await groqChat(this.apiKey, studyModel({}), [{ role: "user", content: extractionPrompt }], 0.7);

      try {
        return JSON.parse(cleanJSON(raw));
      } catch (parseError) {
        console.error("Groq Raw Response JSON Parse Error:", raw);
        return raw;
      }
    } catch (error) {
      console.error("Groq Raw Response Error:", error);
      return null;
    }
  }

  // ============================================
  // SYNTHESIS
  // ============================================

  async synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null,
    notes?: string,
    questions: ScoredQuestion[] = []
  ): Promise<SynthesisResult> {
    const fallback = deterministicSynthesisResult(history, studyConfig, participantProfile);

    if (!this.apiKey) {
      console.error("GROQ_API_KEY missing");
      return fallback;
    }

    try {

      const synthesisPrompt = `
  You are an expert research analyst.

  Analyze the following interview transcript and return ONLY valid JSON.

  Return this exact JSON structure. Arrays must be arrays of strings. Themes must be objects.

  {
    "statedPreferences": string[],
    "revealedPreferences": string[],
    "themes": [
      {
        "theme": string,
        "evidence": string,
        "frequency": number
      }
    ],
    "contradictions": string[],
    "keyInsights": string[],
    "bottomLine": string,
    "extractedProfile": {
      "role": string | null,
      "industry": string | null,
      "ai_frequency": string | null,
      "comfort_level": string | null,
      "years_experience": string | null
    }
  }

  Rules:
  - No markdown
  - No explanation
  - No text outside JSON
  - If a profile field is not mentioned, return null
  - frequency should be numeric
${notes ? `  - For each code snippet, add one keyInsights entry saying whether the candidate found the planted bug in the INTERVIEWER'S NOTES (found / partly / missed) and how good their fix was

  INTERVIEWER'S NOTES (never shown to the candidate):
  ${notes}
` : ''}${questions.length ? `
  SCORE EACH ANSWER BELOW. Add to the JSON: "scores": [{"id": "Q1", "verdict": "correct" | "partly" | "wrong", "reason": string}], one entry per question, same ids.
  - project / fixed questions: correct = technically sound and specific; partly = on the right lines but vague, shallow or with a mistake; wrong = incorrect, off the point or no real answer ("I don't know" is wrong).
  - code questions: judge against the PLANTED BUG: correct = names that bug (its line or its effect) with a fix that works; partly = finds it but the fix is wrong or missing, or names it only vaguely; wrong = misses it.
  - reason: one short sentence a hiring manager can read.

${questions.map((q) => `  ${q.id} (${q.kind}) QUESTION: ${q.question}
  CANDIDATE'S ANSWER: ${q.answer}${q.bug ? `\n  PLANTED BUG: ${q.bug}` : ''}`).join('\n\n')}
` : ''}
  Transcript:
  ${history
    .slice(-24)
    // whole enough that a code snippet and the candidate's answer to it arrive intact
    .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 1200)}`)
    .join("\n")}
  `;

      const raw = await Promise.race([
        groqChat(this.apiKey, studyModel(studyConfig), [{ role: "user", content: synthesisPrompt }], 0.3),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), SYNTHESIS_TIMEOUT_MS);
        })
      ]);

      if (raw === null) {
        console.warn("Groq Synthesis timed out; using transcript fallback.");
        return fallback;
      }

      try {
        const json = JSON.parse(cleanJSON(raw));
        const parsed = normalizeSynthesisResult(json);
        // the AI only gives verdicts; the percentages are worked out from them (lib/scoring.ts)
        const scorecard = buildScorecard(questions, json?.scores);
        if (scorecard) parsed.scorecard = scorecard;
        if (
          parsed.keyInsights.some(insight => /analysis pending/i.test(insight)) ||
          /synthesis in progress/i.test(parsed.bottomLine)
        ) {
          return fallback;
        }
        return {
          ...fallback,
          ...parsed,
          statedPreferences: parsed.statedPreferences.length ? parsed.statedPreferences : fallback.statedPreferences,
          revealedPreferences: parsed.revealedPreferences.length ? parsed.revealedPreferences : fallback.revealedPreferences,
          themes: parsed.themes.length ? parsed.themes : fallback.themes,
          keyInsights: parsed.keyInsights.length ? parsed.keyInsights : fallback.keyInsights,
          bottomLine: parsed.bottomLine || fallback.bottomLine
        };
      } catch (parseError) {
        console.error("Groq Synthesis JSON Parse Error:", raw);
        return fallback;
      }

    } catch (error) {
      console.error("Groq Synthesis Error:", error);
      return fallback;
    }
  }

  // ============================================
  // SCORING AN OLDER INTERVIEW
  // ============================================

  async scoreTranscript(studyConfig: StudyConfig, pairs: TranscriptPair[]): Promise<unknown[] | null> {
    if (!this.apiKey) {
      console.error("GROQ_API_KEY missing");
      return null;
    }

    const prompt = `You are scoring a candidate's answers in a technical job interview held before answers were scored automatically.

THE ROLE:
- Post: ${studyConfig.name}
${studyConfig.jobTitle ? `- Role / Job Title: ${studyConfig.jobTitle}\n` : ''}${studyConfig.jobRequirements ? `- Job Description / Requirements:\n${studyConfig.jobRequirements}\n` : ''}
Each numbered pair below is one interviewer message and the candidate's reply. For EVERY pair decide:
- "kind": "code" if the message shows code and asks about a bug, an error or its output; "project" for any other question with a better and a worse answer (their project, experience, technical knowledge, how they would handle something); "skip" for greetings, "are you ready", asking them to introduce themselves, education history, consent, logistics and the closing.
- "verdict" (not for skip): "correct" = technically sound and specific; "partly" = on the right lines but vague, shallow or with a mistake; "wrong" = incorrect, off the point or no real answer ("I don't know" is wrong). For code, judge from your own careful reading of the code.
- "reason": one short sentence a hiring manager can read.

Reply ONLY with JSON: {"scores": [{"id": "P1", "kind": "project" | "code" | "skip", "verdict": "correct" | "partly" | "wrong", "reason": string}]}

${pairs.map((p) => `${p.id} INTERVIEWER: ${p.question}\n${p.id} CANDIDATE: ${p.answer}`).join('\n\n')}`;

    try {
      const raw = await groqChat(this.apiKey, studyModel(studyConfig), [{ role: "user", content: prompt }], 0.2);
      const parsed = JSON.parse(cleanJSON(raw));
      return Array.isArray(parsed?.scores) ? parsed.scores : null;
    } catch (error) {
      console.error("Groq Scoring Error:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ): Promise<Omit<AggregateSynthesisResult, 'studyId' | 'interviewCount' | 'generatedAt'>> {
    const fallback = deterministicAggregate(studyConfig, syntheses, interviewCount);

    if (!this.apiKey) {
      console.error("GROQ_API_KEY missing");
      return fallback;
    }

    try {
      const prompt = `${buildAggregateSynthesisPrompt(studyConfig, syntheses, interviewCount)}

Return ONLY valid JSON in this exact shape:
{
  "commonThemes": [
    {
      "theme": string,
      "frequency": number,
      "representativeQuotes": string[]
    }
  ],
  "divergentViews": [
    {
      "topic": string,
      "viewA": string,
      "viewB": string
    }
  ],
  "keyFindings": string[],
  "researchImplications": string[],
  "bottomLine": string
}

Rules:
- No markdown
- No explanation outside JSON
- Use concrete findings from the interview syntheses
- Do not return placeholder text such as "analysis pending"`;

      const raw = await groqChat(this.apiKey, studyModel(studyConfig), [{ role: "user", content: prompt }], 0.2);
      const parsed = normalizeAggregateResult(JSON.parse(cleanJSON(raw)));

      if (
        parsed.keyFindings.some(finding => /analysis pending/i.test(finding)) ||
        /synthesis in progress/i.test(parsed.bottomLine)
      ) {
        return fallback;
      }

      return {
        ...fallback,
        ...parsed,
        commonThemes: parsed.commonThemes.length ? parsed.commonThemes : fallback.commonThemes,
        keyFindings: parsed.keyFindings.length ? parsed.keyFindings : fallback.keyFindings,
        researchImplications: parsed.researchImplications.length ? parsed.researchImplications : fallback.researchImplications,
        bottomLine: parsed.bottomLine || fallback.bottomLine
      };
    } catch (error) {
      console.error("Groq Aggregate Synthesis Error:", error);
      return fallback;
    }
  }

  // ============================================
  // FOLLOW-UP STUDY
  // ============================================

  async generateFollowupStudy(
    parentConfig: StudyConfig,
    synthesis: AggregateSynthesisResult
  ): Promise<{ name: string; researchQuestion: string; coreQuestions: string[] }> {

    return {
      name: `Follow-up: ${parentConfig.name}`,
      researchQuestion: "Deepening insights from initial interviews",
      coreQuestions: []
    };
  }
}
