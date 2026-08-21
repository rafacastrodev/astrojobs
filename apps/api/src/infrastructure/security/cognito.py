import jwt

from domain.users.cognito import CognitoIdentity
from domain.users.errors import InvalidCognitoTokenError
from infrastructure.database.config import settings

# Cognito signs ID tokens with RS256 keys published at the pool's JWKS
# endpoint. Anything else is not a token this pool issued.
_ALGORITHMS = ["RS256"]


class CognitoIdTokenVerifier:
    """Verifies a Cognito ID token against the pool's published signing keys.

    The token arrives from the browser and is therefore untrusted input: the
    signature, issuer, audience, expiry and token_use are all checked before
    any claim is read. Without the audience and issuer checks, a valid token
    minted for a different app or pool would be accepted here.
    """

    def __init__(self, jwk_client: jwt.PyJWKClient | None = None):
        if not settings.cognito_user_pool_id or not settings.cognito_client_id:
            raise RuntimeError(
                "Cognito is not configured. "
                "Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID."
            )
        self._issuer = settings.cognito_issuer
        self._audience = settings.cognito_client_id
        # Caches the fetched keys and refreshes them when an unknown kid shows
        # up, so key rotation does not need a redeploy.
        self._jwks = jwk_client or jwt.PyJWKClient(
            settings.cognito_jwks_url, cache_keys=True
        )

    def verify(self, id_token: str) -> CognitoIdentity:
        try:
            signing_key = self._jwks.get_signing_key_from_jwt(id_token)
            claims = jwt.decode(
                id_token,
                signing_key.key,
                algorithms=_ALGORITHMS,
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["exp", "iat", "sub", "aud", "iss"]},
            )
        except Exception as exc:
            raise InvalidCognitoTokenError(str(exc)) from exc

        # Cognito also issues access tokens from the same pool; only the ID
        # token carries verified identity claims.
        if claims.get("token_use") != "id":
            raise InvalidCognitoTokenError("Expected an ID token")

        subject = claims.get("sub")
        if not subject:
            raise InvalidCognitoTokenError("Token has no subject")

        email = claims.get("email")
        return CognitoIdentity(
            subject=subject,
            email=email.strip().lower() if isinstance(email, str) else None,
            # Cognito renders this claim as a bool or the string "true".
            email_verified=str(claims.get("email_verified", "")).lower() == "true",
            name=claims.get("name") or claims.get("given_name"),
        )
