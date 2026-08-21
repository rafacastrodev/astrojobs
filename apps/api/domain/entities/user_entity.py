from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional

UserRole = Literal["user", "admin"]


@dataclass
class UserEntity:
    id: Optional[int]
    name: str
    email: str
    hashed_password: str
    role: UserRole
    created_at: datetime
