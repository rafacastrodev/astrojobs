from typing import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from application.auth.service import AuthService
from application.documents.service import DocumentService
from domain.entities.user_entity import UserEntity
from infrastructure.db.base import SessionLocal
from infrastructure.extraction.file_text_loader import CompositeFileTextLoader
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.repositories.sqlalchemy_document_repository import SqlAlchemyDocumentRepository
from infrastructure.repositories.sqlalchemy_password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository
from infrastructure.services.hashing_embedder import HashingEmbedder

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


def get_document_service(db: Session = Depends(get_db)) -> DocumentService:
    return DocumentService(
        documents=SqlAlchemyDocumentRepository(db),
        file_loader=CompositeFileTextLoader(),
        extractor=HeuristicTextExtractor(),
        embedder=HashingEmbedder(),
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


def require_admin(user: UserEntity = Depends(get_current_user)) -> UserEntity:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
