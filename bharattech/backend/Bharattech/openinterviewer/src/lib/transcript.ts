import { getFixedGreeting } from '@/lib/prompts';
import type { ParticipantExchange } from '@/lib/kv';
import { InterviewMessage, StudyConfig } from '@/types';

/**
 * A candidate's transcript as the server saw it: the fixed greeting, then each answer and the interviewer's reply, in
 * the order they happened. Whatever history a browser sends is not used: it could hold made-up interviewer lines
 * (security report 2026-10-28 lead 17).
 */
export function serverTranscript(studyConfig: StudyConfig, exchanges: ParticipantExchange[]): InterviewMessage[] {
  const startedAt = exchanges[0]?.at ?? Date.now();
  const messages: InterviewMessage[] = [{ id: 'greeting', role: 'ai', content: getFixedGreeting(studyConfig), timestamp: startedAt }];
  exchanges.forEach((exchange, index) => {
    messages.push({ id: `answer-${index + 1}`, role: 'user', content: exchange.answer, timestamp: exchange.at });
    messages.push({ id: `question-${index + 1}`, role: 'ai', content: exchange.question, timestamp: exchange.at });
  });
  return messages;
}
