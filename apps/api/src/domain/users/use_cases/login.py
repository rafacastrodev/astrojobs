from domain.users.entities import UserEntity
from domain.users.errors import InvalidCredentialsError
from domain.users.repository import UserRepository
from domain.users.security import PasswordHasher, TokenService


class LoginUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
        token_service: TokenService,
    ):
        self._users = user_repository
        self._hasher = password_hasher
        self._tokens = token_service

    def execute(self, email: str, password: str) -> tuple[UserEntity, str]:
        user = self._users.get_by_email(email)
        if user is None or not self._hasher.verify(password, user.hashed_password):
            raise InvalidCredentialsError()
        token = self._tokens.create_access_token(user.id)
        return user, token
