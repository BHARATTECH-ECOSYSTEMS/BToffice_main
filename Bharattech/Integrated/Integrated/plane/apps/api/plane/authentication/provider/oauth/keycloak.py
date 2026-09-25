# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import os
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse
import jwt
import pytz
import requests

# Module imports
from plane.authentication.adapter.oauth import OauthAdapter
from plane.license.utils.instance_value import get_configuration_value
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)


class KeycloakOAuthProvider(OauthAdapter):
    provider = "keycloak"
    scope = "openid email profile"

    def __init__(self, request, code=None, state=None, callback=None):
        (
            KEYCLOAK_CLIENT_ID,
            KEYCLOAK_CLIENT_SECRET,
            KEYCLOAK_URL,
            KEYCLOAK_INTERNAL_URL,
            KEYCLOAK_REALM,
        ) = get_configuration_value(
            [
                {
                    "key": "KEYCLOAK_CLIENT_ID",
                    "default": os.environ.get("KEYCLOAK_CLIENT_ID", "plane"),
                },
                {
                    "key": "KEYCLOAK_CLIENT_SECRET",
                    "default": os.environ.get("KEYCLOAK_CLIENT_SECRET", ""),
                },
                {
                    "key": "KEYCLOAK_URL",
                    "default": os.environ.get("KEYCLOAK_URL", "http://localhost:4000"),
                },
                {
                    "key": "KEYCLOAK_INTERNAL_URL",
                    "default": os.environ.get(
                        "KEYCLOAK_INTERNAL_URL",
                        os.environ.get("KEYCLOAK_URL", "http://host.docker.internal:4000"),
                    ),
                },
                {
                    "key": "KEYCLOAK_REALM",
                    "default": os.environ.get("KEYCLOAK_REALM", "bharattech"),
                },
            ]
        )

        if not (KEYCLOAK_CLIENT_ID and KEYCLOAK_URL and KEYCLOAK_REALM):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["KEYCLOAK_NOT_CONFIGURED"],
                error_message="KEYCLOAK_NOT_CONFIGURED",
            )

        auth_host = KEYCLOAK_URL.rstrip("/")
        internal_host = (KEYCLOAK_INTERNAL_URL or KEYCLOAK_URL).rstrip("/")
        realm = KEYCLOAK_REALM

        self.token_url = f"{internal_host}/realms/{realm}/protocol/openid-connect/token"
        self.userinfo_url = f"{internal_host}/realms/{realm}/protocol/openid-connect/userinfo"
        self.public_host_header = urlparse(KEYCLOAK_URL).netloc

        client_id = KEYCLOAK_CLIENT_ID
        client_secret = KEYCLOAK_CLIENT_SECRET or ""

        redirect_uri = f"{'https' if request.is_secure() else 'http'}://{request.get_host()}/auth/keycloak/callback/"
        url_params = {
            "client_id": client_id,
            "scope": self.scope,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }
        auth_url = f"{auth_host}/realms/{realm}/protocol/openid-connect/auth?{urlencode(url_params)}"

        super().__init__(
            request,
            self.provider,
            client_id,
            self.scope,
            redirect_uri,
            auth_url,
            self.token_url,
            self.userinfo_url,
            client_secret,
            code,
            callback=callback,
        )

    def set_token_data(self):
        data = {
            "code": self.code,
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret

        headers = {"Accept": "application/json"}
        if self.public_host_header:
            headers["Host"] = self.public_host_header

        token_response = self.get_user_token(data=data, headers=headers)

        expires_in = token_response.get("expires_in")
        refresh_expires_in = token_response.get("refresh_expires_in")

        super().set_token_data(
            {
                "access_token": token_response.get("access_token"),
                "refresh_token": token_response.get("refresh_token", None),
                "access_token_expired_at": (
                    datetime.now(tz=pytz.utc) + timedelta(seconds=expires_in)
                    if expires_in
                    else None
                ),
                "refresh_token_expired_at": (
                    datetime.now(tz=pytz.utc) + timedelta(seconds=refresh_expires_in)
                    if refresh_expires_in
                    else None
                ),
                "id_token": token_response.get("id_token", ""),
            }
        )

    def get_user_response(self):
        headers = {}
        if self.public_host_header:
            headers["Host"] = self.public_host_header

        try:
            return super().get_user_response(headers=headers)
        except AuthenticationException:
            # Fallback to claims in id_token if available
            id_token = self.token_data.get("id_token")
            if id_token:
                try:
                    decoded = jwt.decode(id_token, options={"verify_signature": False})
                    if decoded.get("email") or decoded.get("sub"):
                        self.logger.info("Successfully extracted user claims from id_token fallback")
                        return decoded
                except Exception as ex:
                    self.logger.warning(f"Failed to decode id_token fallback: {ex}")
            raise

    def set_user_data(self):
        user_info_response = self.get_user_response()
        email = user_info_response.get("email")

        if not email:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["KEYCLOAK_OAUTH_PROVIDER_ERROR"],
                error_message="KEYCLOAK_OAUTH_PROVIDER_ERROR: Email not provided by Keycloak",
            )

        first_name = (
            user_info_response.get("given_name")
            or user_info_response.get("name")
            or user_info_response.get("preferred_username")
            or email.split("@")[0]
        )
        last_name = user_info_response.get("family_name", "")
        provider_id = str(user_info_response.get("sub") or email)
        avatar = user_info_response.get("picture", "")

        super().set_user_data(
            {
                "email": email,
                "user": {
                    "provider_id": provider_id,
                    "email": email,
                    "avatar": avatar,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_password_autoset": True,
                },
            }
        )
