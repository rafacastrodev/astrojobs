from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from domain.users.entities import UserEntity
from domain.users.use_cases.get_current_user import GetCurrentUserUseCase
from domain.users.use_cases.get_profile_photo import GetProfilePhotoUseCase
from domain.users.use_cases.login import LoginUseCase
from domain.users.use_cases.request_password_reset import RequestPasswordResetUseCase
from domain.users.use_cases.reset_password import ResetPasswordUseCase
from domain.users.use_cases.signup import SignupUseCase
from domain.users.use_cases.update_profile import UpdateProfileUseCase
from domain.users.use_cases.upload_profile_photo import UploadProfilePhotoUseCase
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
from infrastructure.storage.s3_file_storage import S3FileStorage

COOKIE_NAME = "jwt"


def get_signup_use_case(db: Session = Depends(get_db)) -> SignupUseCase:
    return SignupUseCase(
        SqlAlchemyUserRepository(db), BcryptPasswordHasher(), JwtTokenService()
    )


def get_login_use_case(db: Session = Depends(get_db)) -> LoginUseCase:
    return LoginUseCase(
        SqlAlchemyUserRepository(db), BcryptPasswordHasher(), JwtTokenService()
    )


def get_current_user_use_case(db: Session = Depends(get_db)) -> GetCurrentUserUseCase:
    return GetCurrentUserUseCase(SqlAlchemyUserRepository(db), JwtTokenService())


def get_request_password_reset_use_case(
    db: Session = Depends(get_db),
) -> RequestPasswordResetUseCase:
    return RequestPasswordResetUseCase(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
        frontend_origin=settings.frontend_origin or "http://localhost:3000",
        environment=settings.environment,
    )


def get_reset_password_use_case(db: Session = Depends(get_db)) -> ResetPasswordUseCase:
    return ResetPasswordUseCase(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
        BcryptPasswordHasher(),
    )


def get_update_profile_use_case(db: Session = Depends(get_db)) -> UpdateProfileUseCase:
    return UpdateProfileUseCase(SqlAlchemyUserRepository(db))


def get_upload_profile_photo_use_case(
    db: Session = Depends(get_db),
) -> UploadProfilePhotoUseCase:
    return UploadProfilePhotoUseCase(SqlAlchemyUserRepository(db), S3FileStorage())


def get_profile_photo_use_case() -> GetProfilePhotoUseCase:
    return GetProfilePhotoUseCase(S3FileStorage())


def get_current_user(
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    use_case: GetCurrentUserUseCase = Depends(get_current_user_use_case),
) -> UserEntity:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    user = use_case.execute(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return user


def require_recruiter(user: UserEntity = Depends(get_current_user)) -> UserEntity:
    if user.role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required"
        )
    return user


def require_professional(user: UserEntity = Depends(get_current_user)) -> UserEntity:
    if user.role != "professional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Professional access required"
        )
    return user
