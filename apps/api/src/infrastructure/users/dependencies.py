from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from domain.users.entities import UserEntity
from domain.users.use_cases.get_current_user import GetCurrentUserUseCase
from domain.users.use_cases.login import LoginUseCase
from domain.users.use_cases.request_password_reset import RequestPasswordResetUseCase
from domain.users.use_cases.reset_password import ResetPasswordUseCase
from domain.users.use_cases.signup import SignupUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.repositories.sqlalchemy_password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)
from infrastructure.security.hashing import BcryptPasswordHasher
from infrastructure.security.jwt import JwtTokenService

COOKIE_NAME = "jwt"


def get_signup_use_case(db: Session = Depends(get_db)) -> SignupUseCase:
    return SignupUseCase(SqlAlchemyUserRepository(db), BcryptPasswordHasher(), JwtTokenService())


def get_login_use_case(db: Session = Depends(get_db)) -> LoginUseCase:
    return LoginUseCase(SqlAlchemyUserRepository(db), BcryptPasswordHasher(), JwtTokenService())


def get_current_user_use_case(db: Session = Depends(get_db)) -> GetCurrentUserUseCase:
    return GetCurrentUserUseCase(SqlAlchemyUserRepository(db), JwtTokenService())


def get_request_password_reset_use_case(
    db: Session = Depends(get_db),
) -> RequestPasswordResetUseCase:
    return RequestPasswordResetUseCase(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
        frontend_origin=settings.frontend_origin,
        environment=settings.environment,
    )


def get_reset_password_use_case(db: Session = Depends(get_db)) -> ResetPasswordUseCase:
    return ResetPasswordUseCase(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
        BcryptPasswordHasher(),
    )


def get_current_user(
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    use_case: GetCurrentUserUseCase = Depends(get_current_user_use_case),
) -> UserEntity:
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = use_case.execute(token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_admin(user: UserEntity = Depends(get_current_user)) -> UserEntity:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
