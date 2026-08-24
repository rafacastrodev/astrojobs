from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from domain.users.entities import UserEntity
from domain.users.errors import UsernameAlreadyExistsError
from domain.users.use_cases.signup import SignupUseCase
from domain.users.username import legacy_username_base, unique_legacy_username
from infrastructure.schemas.user_schemas import SignupRequest


class FakeUsers:
    def __init__(self, existing_name: str | None = None) -> None:
        self.existing_name = existing_name
        self.created_name: str | None = None

    def get_by_name(self, name: str):
        return object() if name == self.existing_name else None

    def get_by_email(self, _email: str):
        return None

    def create(self, name: str, email: str, hashed_password: str, role: str = "user"):
        self.created_name = name
        return UserEntity(1, name, email, hashed_password, role, datetime.now(UTC))


class FakeHasher:
    def hash(self, password: str) -> str:
        return f"hashed:{password}"


class FakeTokens:
    def create_access_token(self, user_id: int) -> str:
        return f"token:{user_id}"


@pytest.mark.parametrize(
    "username",
    ["Rafael Castro", "rafael-castro", "rafael_castro", "rafael!"],
)
def test_signup_schema_rejects_invalid_username(username: str) -> None:
    with pytest.raises(ValidationError):
        SignupRequest(
            username=username, email="rafael@example.com", password="password1"
        )


def test_signup_normalizes_username_to_lowercase() -> None:
    users = FakeUsers()
    use_case = SignupUseCase(users, FakeHasher(), FakeTokens())

    user, _token = use_case.execute("Rafael123", "rafael@example.com", "password1")

    assert user.name == "rafael123"
    assert users.created_name == "rafael123"


def test_signup_rejects_existing_username() -> None:
    users = FakeUsers(existing_name="rafael")
    use_case = SignupUseCase(users, FakeHasher(), FakeTokens())

    with pytest.raises(UsernameAlreadyExistsError):
        use_case.execute("Rafael", "other@example.com", "password1")


def test_legacy_names_are_converted_to_unique_usernames() -> None:
    used: set[str] = set()
    first = unique_legacy_username(legacy_username_base("E2E Runner", 1), 1, used)
    used.add(first)
    second = unique_legacy_username(legacy_username_base("E2E Runner", 2), 2, used)

    assert first == "e2erunner"
    assert second == "e2erunner2"
    assert legacy_username_base("Rafael Castro", 3) == "rafaelcastro"
