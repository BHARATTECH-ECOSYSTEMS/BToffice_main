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
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  {
    collection: 'participant_tokens'
  }
);

export default models.ParticipantToken || model('ParticipantToken', ParticipantTokenSchema);
