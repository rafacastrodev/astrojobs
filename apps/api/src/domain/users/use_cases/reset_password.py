import hashlib

from domain.users.errors import InvalidResetTokenError
from domain.users.password_reset_token_repository import PasswordResetTokenRepository
from domain.users.repository import UserRepository
from domain.users.security import PasswordHasher


class ResetPasswordUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        password_reset_token_repository: PasswordResetTokenRepository,
        password_hasher: PasswordHasher,
    ):
        self._users = user_repository
        self._reset_tokens = password_reset_token_repository
        self._hasher = password_hasher

    def execute(self, raw_token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        reset_token = self._reset_tokens.get_valid_by_token_hash(token_hash)
        if reset_token is None:
            raise InvalidResetTokenError()
        self._users.update_password(
            reset_token.user_id, self._hasher.hash(new_password)
        )
        self._reset_tokens.mark_used(reset_token.id)
