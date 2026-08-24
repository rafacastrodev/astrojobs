from typing import Protocol

from domain.users.entities import UserEntity


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> UserEntity | None: ...

    def get_by_name(self, name: str) -> UserEntity | None: ...

    def get_by_id(self, user_id: int) -> UserEntity | None: ...

    def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str = "professional",
        company: str | None = None,
        job_title: str | None = None,
        region: str | None = None,
        salary_min_usd: int | None = None,
        salary_max_usd: int | None = None,
        onboarding_status: str | None = None,
    ) -> UserEntity: ...

    def create_social(
        self,
        name: str,
        email: str,
    ) -> UserEntity: ...

    def update_password(self, user_id: int, hashed_password: str) -> None: ...

    def update_photo_key(
        self, user_id: int, photo_key: str | None
    ) -> UserEntity | None: ...

    def update_profile(
        self,
        user_id: int,
        *,
        company: str | None,
        job_title: str | None,
        region: str | None,
        salary_min_usd: int | None,
        salary_max_usd: int | None,
        onboarding_status: str | None = None,
    ) -> UserEntity | None: ...

    def ensure_recruiter(
        self, name: str, email: str, hashed_password: str
    ) -> UserEntity: ...
