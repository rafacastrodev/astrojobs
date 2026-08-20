import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from application.auth.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)
from core.config import settings
from domain.entities.user_entity import UserEntity
from domain.repositories.password_reset_token_repository import PasswordResetTokenRepository
from domain.repositories.user_repository import UserRepository
from infrastructure.security.hashing import hash_password, verify_password
from infrastructure.security.jwt import create_access_token, decode_access_token

logger = logging.getLogger(__name__)

RESET_TOKEN_TTL = timedelta(hours=1)


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        password_reset_token_repository: PasswordResetTokenRepository,
    ):
        self._users = user_repository
        self._reset_tokens = password_reset_token_repository

    def signup(self, name: str, email: str, password: str) -> tuple[UserEntity, str]:
        if self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)
        user = self._users.create(name, email, hash_password(password))
        token = create_access_token(user.id)
        return user, token

    def login(self, email: str, password: str) -> tuple[UserEntity, str]:
        user = self._users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()
        token = create_access_token(user.id)
        return user, token

    def get_current_user(self, token: str) -> UserEntity | None:
        user_id = decode_access_token(token)
        if user_id is None:
            return None
        return self._users.get_by_id(user_id)

    def request_password_reset(self, email: str) -> None:
        user = self._users.get_by_email(email)
        if user is None:
            return
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + RESET_TOKEN_TTL
        self._reset_tokens.create(user.id, token_hash, expires_at)
        reset_link = f"{settings.frontend_origin}/reset-password?token={raw_token}"
        if settings.environment != "production":
            logger.info("Password reset link for %s: %s", email, reset_link)

    def reset_password(self, raw_token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        reset_token = self._reset_tokens.get_valid_by_token_hash(token_hash)
        if reset_token is None:
            raise InvalidResetTokenError()
        self._users.update_password(reset_token.user_id, hash_password(new_password))
        self._reset_tokens.mark_used(reset_token.id)
