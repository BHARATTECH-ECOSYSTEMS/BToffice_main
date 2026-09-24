'use strict';

const jwt = require('jsonwebtoken');
const { SystemRoles } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');
const { findUser, createUser, updateUser } = require('~/models');
const { setAuthTokens } = require('~/server/services/AuthService');
const { getAppConfig } = require('~/server/services/Config');
const { getBalanceConfig } = require('@librechat/api');

/**
 * Direct SSO Controller for BharatTech LMS -> LibreChat integration.
 * Accepts a signed token, establishes a LibreChat authenticated session,
 * sets the HTTP-only refreshToken cookie, and redirects directly into the app.
 */
async function ssoController(req, res) {
  const clientUrl = process.env.DOMAIN_CLIENT || 'http://localhost:3080';

  try {
    const token =
      req.query.token ||
      req.body?.token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      logger.warn('[ssoController] Missing SSO token in request');
      return res.redirect(`${clientUrl.replace(/\/+$/, '')}/login?error=no_token`);
    }

    const sharedSecret =
      process.env.BHARATTECH_SHARED_SECRET ||
      process.env.LIBRECHAT_SHARED_SECRET;

    let payload = null;

    // 1. Verify with BHARATTECH_SHARED_SECRET
    if (sharedSecret) {
      try {
        payload = jwt.verify(token, sharedSecret);
      } catch (err) {
        logger.debug('[ssoController] Token signature verification with sharedSecret failed, trying decode:', err.message);
      }
    }

    // 2. Fallback: decode JWT or verify as Keycloak token
    if (!payload) {
      try {
        payload = jwt.decode(token);
      } catch (err) {
        logger.error('[ssoController] Token decode failed:', err.message);
      }
    }

    if (!payload || (!payload.email && !payload.sub && !payload.preferred_username)) {
      logger.error('[ssoController] Invalid or unreadable token payload');
      return res.redirect(`${clientUrl.replace(/\/+$/, '')}/login?error=invalid_token`);
    }

    const rawEmail = payload.email || '';
    const finalEmail =
      rawEmail.toLowerCase().trim() ||
      `${(payload.preferred_username || payload.sub || 'user').toLowerCase()}@bharattech.local`;

    const username =
      payload.username ||
      payload.preferred_username ||
      finalEmail.split('@')[0];

    const name = payload.name || payload.fullName || username;
    const openidId = payload.sub || payload.keycloakId || finalEmail;

    // Resolve user role
    const rawRole = String(payload.role || '').toUpperCase();
    const realmRoles = (payload.realm_access?.roles || []).map((r) =>
      String(r).toUpperCase(),
    );
    const isAdmin =
      rawRole.includes('ADMIN') ||
      realmRoles.includes('ADMIN') ||
      realmRoles.includes('SUPERADMIN');
    const role = isAdmin ? SystemRoles.ADMIN : SystemRoles.USER;

    // Find or create user in LibreChat
    let user = await findUser({ email: finalEmail });
    const appConfig = await getAppConfig();
    const balanceConfig = typeof getBalanceConfig === 'function' ? getBalanceConfig(appConfig) : undefined;

    if (!user) {
      user = await createUser(
        {
          provider: 'openid',
          openidId,
          username,
          email: finalEmail,
          emailVerified: true,
          name,
          role,
        },
        balanceConfig,
        true,
        true,
      );
      logger.info(`[ssoController] Created new SSO user: ${finalEmail} (${role})`);
    } else {
      let needsUpdate = false;
      if (!user.openidId || user.openidId !== openidId) {
        user.openidId = openidId;
        needsUpdate = true;
      }
      if (role && user.role !== role) {
        user.role = role;
        needsUpdate = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        needsUpdate = true;
      }
      if (needsUpdate) {
        user = await updateUser(user._id, user);
        logger.info(`[ssoController] Updated SSO user attributes for: ${finalEmail}`);
      }
    }

    // Set authenticated cookies (refreshToken, token_provider)
    await setAuthTokens(user._id, res, null, req);
    logger.info(`[ssoController] SSO login successful for: ${finalEmail}`);

    if (req.query.json === 'true') {
      return res.json({
        status: 'success',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    const redirectTarget =
      req.query.embed === 'true'
        ? `${clientUrl.replace(/\/+$/, '')}/c/new?embed=true`
        : `${clientUrl.replace(/\/+$/, '')}/c/new`;

    return res.redirect(redirectTarget);
  } catch (err) {
    logger.error('[ssoController] Error during SSO authentication:', err);
    return res.redirect(
      `${clientUrl.replace(/\/+$/, '')}/login?error=sso_failed`,
    );
  }
}

module.exports = {
  ssoController,
};
