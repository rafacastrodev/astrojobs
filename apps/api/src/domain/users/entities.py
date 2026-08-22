from dataclasses import dataclass
from datetime import datetime
from typing import Literal

UserRole = Literal["user", "admin"]


@dataclass
class UserEntity:
    id: int
    name: str
    email: str
    # None for social-only accounts, which cannot sign in with a password.
    hashed_password: str | None
    role: UserRole
    created_at: datetime
