import { Schema, model, models } from 'mongoose';

// Ids of portal launch passes already turned into a session. The unique index makes a second use fail even when two
// requests race; each record goes away once its pass would have expired anyway.
const UsedLaunchPassSchema = new Schema(
  {
    passId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 }
  },
  {
    collection: 'used_launch_passes'
  }
);

export default models.UsedLaunchPass || model('UsedLaunchPass', UsedLaunchPassSchema);
