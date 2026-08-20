from typing import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from application.auth.service import AuthService
from domain.entities.user_entity import UserEntity
from infrastructure.db.base import SessionLocal
from infrastructure.repositories.sqlalchemy_password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository

COOKIE_NAME = "jwt"


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
    )


def get_current_user(
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserEntity:
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = auth_service.get_current_user(token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user
