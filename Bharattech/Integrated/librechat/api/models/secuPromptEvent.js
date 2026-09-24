'use strict';

/**
 * secuPromptEvent.js — Mongoose model for SecuPrompt injection events.
 *
 * Each document represents a single blocked or sanitized prompt attempt.
 * Stored in the `secuprompt_events` collection within LibreChat's MongoDB.
 * Only admin/super-admin can query this collection via the admin API.
 */

const mongoose = require('mongoose');

const moduleScoreSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0 },
    detail: [{ type: String }],
  },
  { _id: false },
);

const secuPromptEventSchema = new mongoose.Schema(
  {
    /** LibreChat userId (references User collection) */
    userId: { type: String, index: true, default: 'unknown' },

    /** Denormalized display info — copied from LibreChat user at event time */
    userEmail: { type: String, default: '' },
    userName: { type: String, default: '' },

    /** What SecuPrompt decided */
    action: {
      type: String,
      enum: ['block', 'sanitize'],
      required: true,
      index: true,
    },

    /** Combined risk score 0–1 */
    risk: { type: Number, required: true },

    /** Top-level reasons array (module detail tags) */
    reasons: [{ type: String }],

    /** Original flagged user text (first 500 chars) — for admin audit */
    flaggedText: { type: String, default: '', maxlength: 500 },

    /** Per-module risk scores snapshot */
    modules: {
      signature: { type: moduleScoreSchema, default: () => ({}) },
      semantic: { type: moduleScoreSchema, default: () => ({}) },
      integrity: { type: moduleScoreSchema, default: () => ({}) },
      rag: { type: moduleScoreSchema, default: () => ({}) },
      unicode: { type: moduleScoreSchema, default: () => ({}) },
      segments: { type: moduleScoreSchema, default: () => ({}) },
    },

    /** Which API endpoint triggered this event */
    endpoint: { type: String, default: '' },

    /** IP address (for geo/repeat-offender analytics) */
    ipAddress: { type: String, default: '' },
  },
  {
    timestamps: true, // createdAt + updatedAt
    collection: 'secuprompt_events',
  },
);

// Compound index for the admin list query: newest first, filterable by action
secuPromptEventSchema.index({ createdAt: -1 });
secuPromptEventSchema.index({ userId: 1, createdAt: -1 });
secuPromptEventSchema.index({ action: 1, createdAt: -1 });

const SecuPromptEvent =
  mongoose.models.SecuPromptEvent ||
  mongoose.model('SecuPromptEvent', secuPromptEventSchema);

module.exports = SecuPromptEvent;
