from datetime import UTC, datetime, timedelta

import jwt

from infrastructure.database.config import settings


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return int(payload["sub"])


class JwtTokenService:
    def create_access_token(self, user_id: int) -> str:
        return create_access_token(user_id)

    def decode_access_token(self, token: str) -> int | None:
        return decode_access_token(token)
