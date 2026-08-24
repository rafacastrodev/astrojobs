from domain.users.entities import UserEntity, UserRole
from domain.users.errors import EmailAlreadyExistsError, UsernameAlreadyExistsError
from domain.users.profile import initial_onboarding_status
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
        self,
        username: str,
        email: str,
        password: str,
        role: UserRole,
        *,
        company: str | None = None,
        job_title: str | None = None,
        region: str | None = None,
        salary_min_usd: int | None = None,
        salary_max_usd: int | None = None,
    ) -> tuple[UserEntity, str]:
        username = username.lower()
        if self._users.get_by_name(username) is not None:
            raise UsernameAlreadyExistsError(username)
        if self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)
        user = self._users.create(
            username,
            email,
            self._hasher.hash(password),
            role,
            company=company,
            job_title=job_title,
            region=region,
            salary_min_usd=salary_min_usd,
            salary_max_usd=salary_max_usd,
            onboarding_status=initial_onboarding_status(role, job_title, region),
        )
        token = self._tokens.create_access_token(user.id)
        return user, token
