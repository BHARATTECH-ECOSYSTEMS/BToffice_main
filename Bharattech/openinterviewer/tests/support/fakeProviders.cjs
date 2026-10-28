// Stand-in for @/lib/providers: no AI key and no network. Each call records the study it was given, so tests can
// check which study settings the interview really ran on.
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

const fakeProvider = (studyConfig) => ({
  async generateInterviewResponse() {
    calls.push({ kind: 'turn', studyConfig });
    return { message: 'Thanks. Could you tell me about a project you have built?', phaseTransition: 'project', shouldConclude: false };
  },
  async synthesizeInterview() {
    calls.push({ kind: 'synthesis', studyConfig });
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
};
