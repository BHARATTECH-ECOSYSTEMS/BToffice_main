'use strict';

/**
 * secuPromptMiddleware.js
 *
 * Express middleware that runs the SecuPrompt prompt-injection firewall
 * before every user message reaches the LLM controller.
 *
 * Configuration (via .env):
 *   SECUPROMPT_ENABLED=true          Enable the firewall (default: off)
 *   SECUPROMPT_MODE=block            Ceiling action: "allow" | "sanitize" | "block"
 *                                     "block"    — full protection (default)
 *                                     "sanitize" — never hard-block, only sanitize
 *                                     "allow"    — log only, never modify or block
 *
 * Request body fields inspected (matching moderateText.js):
 *   text          — user-typed message
 *   answer        — HITL free-text answer
 *   answers       — HITL answer map (values joined)
 *   decisions[].responseText / .reason — tool-approval resume text
 *
 * On "block"    → calls denyRequest() with { type: "moderation" }
 * On "sanitize" → replaces req.body.text with sanitized_prompt, calls next()
 * On "allow"    → calls next() with no changes
 *
 * Every non-allow event is logged and persisted asynchronously to the
 * `secuprompt_events` MongoDB collection for admin visibility.
 */

const { isEnabled } = require('@librechat/api');
const { runSecuPrompt } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { ErrorTypes } = require('librechat-data-provider');
const SecuPromptEvent = require('~/models/secuPromptEvent');
const denyRequest = require('./denyRequest');

// ─── Mode helpers ─────────────────────────────────────────────────────────────

/** Resolve the effective action ceiling from env. */
function getModeCeiling() {
  const raw = (process.env.SECUPROMPT_MODE ?? 'block').toLowerCase();
  if (raw === 'allow') return 'allow';
  if (raw === 'sanitize') return 'sanitize';
  return 'block';
}

/** Apply the mode ceiling: cap the SecuPrompt action at the configured max. */
function applyModeCeiling(action, ceiling) {
  const ORDER = { allow: 0, sanitize: 1, block: 2 };
  return ORDER[action] <= ORDER[ceiling] ? action : ceiling;
}

// ─── Text extractor ───────────────────────────────────────────────────────────

/**
 * Extract the primary user text from the request body.
 * Mirrors the logic in moderateText.js so both filters see the same input.
 */
function extractUserText(body) {
  if (typeof body.text === 'string' && body.text.length > 0) return body.text;
  if (typeof body.answer === 'string' && body.answer.length > 0) return body.answer;
  // answers map: collect all non-empty values
  if (body.answers != null && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
    const parts = Object.values(body.answers)
      .filter((v) => typeof v === 'string' && v.length > 0)
      .join(' ');
    if (parts.length > 0) return parts;
  }
  // tool-approval decisions
  if (Array.isArray(body.decisions)) {
    const parts = [];
    for (const d of body.decisions) {
      if (typeof d?.responseText === 'string' && d.responseText.length > 0) parts.push(d.responseText);
      if (typeof d?.reason === 'string' && d.reason.length > 0) parts.push(d.reason);
    }
    if (parts.length > 0) return parts.join(' ');
  }
  return null;
}

// ─── Event persistence (async, non-blocking) ─────────────────────────────────

/**
 * Persist an injection event to MongoDB for admin audit.
 * This is intentionally fire-and-forget — never awaited on the request path.
 */
async function saveEvent(req, userText, action, result) {
  try {
    await SecuPromptEvent.create({
      userId: req.user?.id ?? 'unknown',
      userEmail: req.user?.email ?? '',
      userName: req.user?.name ?? req.user?.fullName ?? req.user?.username ?? '',
      action,
      risk: result.risk,
      reasons: result.reason ?? [],
      flaggedText: (userText ?? '').slice(0, 500),
      modules: result.modules ?? {},
      endpoint: `${req.method} ${req.path}`,
      ipAddress: req.ip ?? '',
    });
  } catch (err) {
    // Re-throw so the caller's .catch() can log it
    throw err;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Core SecuPrompt middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function secuPromptMiddleware(req, res, next) {
  // ── 1. Feature flag check ────────────────────────────────────────────────
  if (!isEnabled(process.env.SECUPROMPT_ENABLED)) {
    return next();
  }

  // ── 2. Extract user text ─────────────────────────────────────────────────
  const userText = extractUserText(req.body ?? {});
  if (!userText) {
    // Nothing to inspect (e.g. tool-approval with no text)
    return next();
  }

  // ── 3. Run SecuPrompt scan ───────────────────────────────────────────────
  let result;
  try {
    result = runSecuPrompt({ user: userText });
  } catch (err) {
    // Never block on scanner errors — fail open so LLM remains available.
    logger.error('[SecuPrompt] Scanner threw an error — failing open:', err);
    return next();
  }

  // ── 4. Apply mode ceiling ────────────────────────────────────────────────
  const ceiling = getModeCeiling();
  const effectiveAction = applyModeCeiling(result.action, ceiling);

  // ── 5. Audit logging + async persistence ─────────────────────────────────
  if (effectiveAction !== 'allow') {
    logger.warn('[SecuPrompt] Prompt injection detected', {
      userId: req.user?.id,
      userName: req.user?.name ?? req.user?.fullName ?? '',
      conversationId: req.body?.conversationId,
      action: effectiveAction,
      risk: result.risk,
      reason: result.reason,
      modules: {
        signature: result.modules.signature.score,
        semantic: result.modules.semantic.score,
        integrity: result.modules.integrity.score,
        rag: result.modules.rag.score,
        unicode: result.modules.unicode.score,
        segments: result.modules.segments.score,
      },
    });

    // Persist event to MongoDB asynchronously — never blocks the request path.
    saveEvent(req, userText, effectiveAction, result).catch((err) =>
      logger.error('[SecuPrompt] Failed to persist event to MongoDB:', err),
    );
  }

  // ── 6. Enforce action ────────────────────────────────────────────────────
  if (effectiveAction === 'block') {
    return denyRequest(req, res, { type: ErrorTypes.MODERATION, message: 'prompt_injection_blocked' });
  }

  if (effectiveAction === 'sanitize' && result.sanitized_prompt) {
    logger.info('[SecuPrompt] Sanitizing user message before forwarding to LLM', {
      userId: req.user?.id,
      risk: result.risk,
      reason: result.reason,
    });
    // Mutate req.body.text in-place so downstream handlers receive the safe version.
    req.body.text = result.sanitized_prompt;
  }

  return next();
}

module.exports = secuPromptMiddleware;
