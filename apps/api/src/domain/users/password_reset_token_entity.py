from dataclasses import dataclass
from datetime import datetime


@dataclass
class PasswordResetTokenEntity:
    id: int | None
    user_id: int
    token_hash: str
    expires_at: datetime
    used_at: datetime | None
