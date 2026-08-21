from typing import Optional, Protocol

from domain.entities.user_entity import UserEntity


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> Optional[UserEntity]: ...

    def get_by_id(self, user_id: int) -> Optional[UserEntity]: ...

    def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str = "user",
    ) -> UserEntity: ...

    def update_password(self, user_id: int, hashed_password: str) -> None: ...

    def ensure_admin(self, name: str, email: str, hashed_password: str) -> UserEntity: ...
