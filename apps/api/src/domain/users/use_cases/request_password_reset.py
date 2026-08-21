import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from domain.users.password_reset_token_repository import PasswordResetTokenRepository
from domain.users.repository import UserRepository

logger = logging.getLogger(__name__)

RESET_TOKEN_TTL = timedelta(hours=1)


class RequestPasswordResetUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        password_reset_token_repository: PasswordResetTokenRepository,
        frontend_origin: str,
        environment: str,
    ):
        self._users = user_repository
        self._reset_tokens = password_reset_token_repository
        self._frontend_origin = frontend_origin
        self._environment = environment

    def execute(self, email: str) -> None:
        user = self._users.get_by_email(email)
        if user is None:
            return
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + RESET_TOKEN_TTL
        self._reset_tokens.create(user.id, token_hash, expires_at)
        reset_link = f"{self._frontend_origin}/reset-password?token={raw_token}"
        if self._environment != "production":
            logger.info("Password reset link for %s: %s", email, reset_link)
