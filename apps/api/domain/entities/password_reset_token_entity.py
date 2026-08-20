from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PasswordResetTokenEntity:
    id: Optional[int]
    user_id: int
    token_hash: str
    expires_at: datetime
    used_at: Optional[datetime]
