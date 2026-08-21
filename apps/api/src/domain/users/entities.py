from dataclasses import dataclass
from datetime import datetime
from typing import Literal

UserRole = Literal["user", "admin"]


@dataclass
class UserEntity:
    id: str
    name: str
    email: str
    hashed_password: str
    role: UserRole
    created_at: datetime
