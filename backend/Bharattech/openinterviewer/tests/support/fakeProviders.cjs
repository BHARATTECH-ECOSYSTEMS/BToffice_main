// Stand-in for @/lib/providers: no AI key and no network. Each call records the study (and for a turn, the step) it
// was given, so tests can check which study settings and which interview step the server really asked for.
const calls = [];
// a test can keep the summary waiting (like a slow AI) or make it fail, to check what doesn't wait on it
let gate = null;
let failNext = false;
const holdSynthesis = () => {
  let release;
  gate = new Promise((resolve) => (release = resolve));
  return () => {
    gate = null;
    release();
  };
};
const failNextSynthesis = () => {
  failNext = true;
};
// what the next turns answer with (interviewFlow tests): { fail, notAnswered, deepdive: {...}, snippet: {...} }
let script = {};
const scriptTurns = (next) => {
  script = next || {};
};
// what scoring an older interview answers with (olderScores tests): an array of verdicts, or null for an AI failure
let scores = [];
const scriptScores = (next) => {
  scores = next;
};

const fakeProvider = (studyConfig) => ({
  async generateInterviewResponse(history, config, profile, step, options = {}) {
    calls.push({ kind: 'turn', studyConfig, step, reaskAllowed: options.reaskAllowed });
    if (script.fail) return { message: 'stand-in failure', profileUpdates: [], failed: true };
    // a reply with no question in it (seen on Groq: "Understood."), for the next `noQuestion` calls
    if (script.noQuestion > 0) {
      script.noQuestion -= 1;
      return { message: 'Understood.', profileUpdates: [], answered: true };
    }
    if (script.notAnswered && options.reaskAllowed) return { message: 'Let me ask that another way: what did you build?', profileUpdates: [], answered: false };
    const reply = { message: 'Thanks. Could you tell me about a project you have built?', profileUpdates: [], answered: true };
    if (step === 'deepdive' && script.deepdive) Object.assign(reply, script.deepdive);
    // a snippet carries its code and its planted bug, or the route treats the turn as failed
    if (String(step).startsWith('snippet:')) {
      Object.assign(reply, { message: 'Snippet:\n```js\n1. const total = items.length - 1;\n```\nWhich line has the bug?', bug: { line: 1, explanation: 'stand-in bug', fix: 'stand-in fix' } }, script.snippet);
    }
    return reply;
  },
  async scoreTranscript(config, pairs) {
    calls.push({ kind: 'score', studyConfig, pairs });
    return scores;
  },
  async synthesizeInterview(history, config, behaviorData, profile, notes, questions) {
    calls.push({ kind: 'synthesis', studyConfig, notes, questions });
    if (gate) await gate;
    if (failNext) {
      failNext = false;
      throw new Error('stand-in AI failure');
    }
    return { statedPreferences: [], revealedPreferences: [], themes: [], contradictions: [], keyInsights: [], bottomLine: 'stand-in' };
  },
});

module.exports = {
  getInterviewProvider: (studyConfig) => fakeProvider(studyConfig),
  providerCalls: calls,
  holdSynthesis,
  failNextSynthesis,
  scriptTurns,
  scriptScores,
};
