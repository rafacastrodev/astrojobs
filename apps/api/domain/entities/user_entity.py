from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class UserEntity:
    id: Optional[int]
    name: str
    email: str
    hashed_password: str
    created_at: datetime