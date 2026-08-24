from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from domain.users.entities import UserEntity
from domain.users.errors import InvalidCredentialsError
from domain.users.use_cases.login import LoginUseCase
from infrastructure.schemas.user_schemas import LoginRequest


class FakeUsers:
    def __init__(self, user: UserEntity | None = None) -> None:
        self.user = user

    def get_by_email(self, email: str):
        if self.user is not None and self.user.email == email:
            return self.user
        return None

    def get_by_name(self, name: str):
        if self.user is not None and self.user.name == name:
            return self.user
        return None


class FakeHasher:
    def verify(self, password: str, hashed_password: str) -> bool:
        return hashed_password == f"hashed:{password}"


class FakeTokens:
    def create_access_token(self, user_id: int) -> str:
        return f"token:{user_id}"


def _user() -> UserEntity:
    return UserEntity(
        1,
        "rafael",
        "rafael@example.com",
        "hashed:password1",
        "user",
        datetime.now(UTC),
    )


def test_login_request_accepts_a_username() -> None:
    body = LoginRequest(email="rafael", password="password1")
    assert body.email == "rafael"


def test_login_request_still_accepts_an_email() -> None:
    body = LoginRequest(email="rafael@example.com", password="password1")
    assert body.email == "rafael@example.com"


def test_login_request_rejects_an_empty_identifier() -> None:
    with pytest.raises(ValidationError):
        LoginRequest(email="", password="password1")


def test_login_with_email() -> None:
    use_case = LoginUseCase(FakeUsers(_user()), FakeHasher(), FakeTokens())
    user, token = use_case.execute("rafael@example.com", "password1")
    assert user.email == "rafael@example.com"
    assert token == "token:1"


def test_login_with_username() -> None:
    use_case = LoginUseCase(FakeUsers(_user()), FakeHasher(), FakeTokens())
    user, token = use_case.execute("Rafael", "password1")
    assert user.name == "rafael"
    assert token == "token:1"


def test_login_rejects_unknown_username() -> None:
    use_case = LoginUseCase(FakeUsers(_user()), FakeHasher(), FakeTokens())
    with pytest.raises(InvalidCredentialsError):
        use_case.execute("other", "password1")
