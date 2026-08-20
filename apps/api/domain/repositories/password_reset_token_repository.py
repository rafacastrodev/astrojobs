from datetime import datetime
from typing import Optional, Protocol

from domain.entities.password_reset_token_entity import PasswordResetTokenEntity


class PasswordResetTokenRepository(Protocol):
    def create(
        self, user_id: int, token_hash: str, expires_at: datetime
    ) -> PasswordResetTokenEntity: ...

    def get_valid_by_token_hash(self, token_hash: str) -> Optional[PasswordResetTokenEntity]: ...

    def mark_used(self, token_id: int) -> None: ...
