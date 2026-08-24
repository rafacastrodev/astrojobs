from domain.users.entities import UserEntity
from domain.users.errors import EmailAlreadyExistsError, UsernameAlreadyExistsError
from domain.users.repository import UserRepository
from domain.users.security import PasswordHasher, TokenService


class SignupUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
        token_service: TokenService,
    ):
        self._users = user_repository
        self._hasher = password_hasher
        self._tokens = token_service

    def execute(
        self, username: str, email: str, password: str
    ) -> tuple[UserEntity, str]:
        username = username.lower()
        if self._users.get_by_name(username) is not None:
            raise UsernameAlreadyExistsError(username)
        if self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)
        user = self._users.create(username, email, self._hasher.hash(password))
        token = self._tokens.create_access_token(user.id)
        return user, token
