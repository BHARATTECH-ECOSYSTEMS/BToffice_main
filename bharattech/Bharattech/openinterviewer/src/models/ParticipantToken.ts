import { Schema, model, models } from 'mongoose';

const ParticipantTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    studyId: { type: String, required: true, index: true },
    studyConfig: { type: Object, required: true },
    terminationReason: { type: String },
    terminatedAt: { type: Date },
    // set once when the candidate finishes; the link can't start or finish an interview again
    completedAt: { type: Date },
    // interview turns used, counted here because the history a browser sends can be reset
    turns: { type: Number, default: 0 },
    // each interview turn's answer and the interviewer's reply, as the server saw them: the saved transcript is built
    // from these, never from what the browser sends (security report 2026-10-28 lead 17)
    // step / note / planned: which interview step the reply belongs to and the AI's hidden notes (lib/kv.ts)
    exchanges: { type: [{ _id: false, answer: String, question: String, at: Date, step: String, note: String, planned: Number }], default: [] },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  {
    collection: 'participant_tokens'
  }
);

export default models.ParticipantToken || model('ParticipantToken', ParticipantTokenSchema);
