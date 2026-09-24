'use strict';

/**
 * GET /api/admin/secuprompt/events
 *
 * Returns a paginated list of prompt-injection events for the admin dashboard.
 * Authentication: X-BharatTech-Secret header (shared secret, server-to-server).
 * Only the LMS backend should call this endpoint — it is NOT a user-facing route.
 *
 * Query params:
 *   limit   {number}  Max records to return (default 50, max 200)
 *   skip    {number}  Offset for pagination (default 0)
 *   action  {string}  Filter: "block" | "sanitize" | "" (all)
 *   userId  {string}  Filter by LibreChat userId
 *   from    {string}  ISO date — events after this date
 *   to      {string}  ISO date — events before this date
 *   search  {string}  Substring match on userName or userEmail
 */

const express = require('express');
const SecuPromptEvent = require('~/models/secuPromptEvent');

const router = express.Router();

// ─── Shared-secret guard ──────────────────────────────────────────────────────

/**
 * The LMS backend authenticates with the same shared secret used for
 * embed-token generation. This keeps the endpoint internal-only without
 * requiring a full LibreChat JWT session.
 */
function requireSharedSecret(req, res, next) {
  const secret =
    process.env.BHARATTECH_SHARED_SECRET || process.env.LIBRECHAT_SHARED_SECRET;

  if (!secret) {
    // If no secret is configured, block all access (misconfiguration safeguard).
    return res.status(503).json({ error: 'SecuPrompt admin endpoint not configured.' });
  }

  const provided = req.headers['x-bharattech-secret'] ?? '';
  if (!provided || provided !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

// ─── GET /api/admin/secuprompt/events ────────────────────────────────────────

router.get('/events', requireSharedSecret, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    // Build query filter
    const filter = {};

    if (req.query.action === 'block' || req.query.action === 'sanitize') {
      filter.action = req.query.action;
    }

    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    // Text search on name or email (case-insensitive substring)
    if (req.query.search) {
      const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ userName: rx }, { userEmail: rx }];
    }

    const [events, total] = await Promise.all([
      SecuPromptEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecuPromptEvent.countDocuments(filter),
    ]);

    return res.json({
      events,
      total,
      limit,
      skip,
      page: Math.floor(skip / limit) + 1,
    });
  } catch (err) {
    console.error('[SecuPrompt admin] Error fetching events:', err);
    return res.status(500).json({ error: 'Failed to fetch SecuPrompt events.' });
  }
});

// ─── GET /api/admin/secuprompt/stats ─────────────────────────────────────────

/**
 * Returns aggregate statistics:
 *  - total events, blocked count, sanitized count
 *  - top offenders (by event count)
 *  - events in last 24h, 7d, 30d
 */
router.get('/stats', requireSharedSecret, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      blocked,
      sanitized,
      last24h,
      last7d,
      last30d,
      topOffenders,
    ] = await Promise.all([
      SecuPromptEvent.countDocuments({}),
      SecuPromptEvent.countDocuments({ action: 'block' }),
      SecuPromptEvent.countDocuments({ action: 'sanitize' }),
      SecuPromptEvent.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      SecuPromptEvent.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      SecuPromptEvent.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      SecuPromptEvent.aggregate([
        { $group: { _id: '$userId', userName: { $first: '$userName' }, userEmail: { $first: '$userEmail' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return res.json({
      total,
      blocked,
      sanitized,
      last24h,
      last7d,
      last30d,
      topOffenders,
    });
  } catch (err) {
    console.error('[SecuPrompt admin] Error fetching stats:', err);
    return res.status(500).json({ error: 'Failed to fetch SecuPrompt stats.' });
  }
});

module.exports = router;
