from typing import Protocol

from domain.users.entities import UserEntity


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> UserEntity | None: ...

    def get_by_id(self, user_id: int) -> UserEntity | None: ...

    def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str = "user",
    ) -> UserEntity: ...

    def create_social(
        self,
        name: str,
        email: str,
    ) -> UserEntity: ...

    def update_password(self, user_id: int, hashed_password: str) -> None: ...

    def ensure_admin(
        self, name: str, email: str, hashed_password: str
    ) -> UserEntity: ...
