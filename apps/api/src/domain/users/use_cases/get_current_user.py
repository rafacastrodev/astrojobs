from domain.users.entities import UserEntity
from domain.users.repository import UserRepository
from domain.users.security import TokenService


class GetCurrentUserUseCase:
    def __init__(self, user_repository: UserRepository, token_service: TokenService):
        self._users = user_repository
        self._tokens = token_service

    def execute(self, token: str) -> UserEntity | None:
        user_id = self._tokens.decode_access_token(token)
        if user_id is None:
            return None
        return self._users.get_by_id(user_id)
