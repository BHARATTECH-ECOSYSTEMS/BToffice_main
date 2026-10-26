// Stand-in for @/lib/providers: no AI key and no network. Each call records the study it was given, so tests can
// check which study settings the interview really ran on.
const calls = [];

const fakeProvider = (studyConfig) => ({
  async generateInterviewResponse() {
    calls.push({ kind: 'turn', studyConfig });
    return { message: 'Thanks. Could you tell me about a project you have built?', phaseTransition: 'project', shouldConclude: false };
  },
  async synthesizeInterview() {
    calls.push({ kind: 'synthesis', studyConfig });
    return { statedPreferences: [], revealedPreferences: [], themes: [], contradictions: [], keyInsights: [], bottomLine: 'stand-in' };
  },
});

module.exports = {
  getInterviewProvider: (studyConfig) => fakeProvider(studyConfig),
  providerCalls: calls,
};
