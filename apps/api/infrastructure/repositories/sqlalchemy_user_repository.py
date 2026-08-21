from typing import Optional

from sqlalchemy.orm import Session

from domain.entities.user_entity import UserEntity
from infrastructure.models.user_model import UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: Session):
        self._session = session

    def get_by_email(self, email: str) -> Optional[UserEntity]:
        model = self._session.query(UserModel).filter(UserModel.email == email).one_or_none()
        return self._to_entity(model) if model else None

    def get_by_id(self, user_id: int) -> Optional[UserEntity]:
        model = self._session.get(UserModel, user_id)
        return self._to_entity(model) if model else None

    def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str = "user",
    ) -> UserEntity:
        model = UserModel(name=name, email=email, hashed_password=hashed_password, role=role)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def update_password(self, user_id: int, hashed_password: str) -> None:
        model = self._session.get(UserModel, user_id)
        if model is None:
            return
        model.hashed_password = hashed_password
        self._session.commit()

    def ensure_admin(self, name: str, email: str, hashed_password: str) -> UserEntity:
        existing = self.get_by_email(email)
        if existing is not None:
            model = self._session.get(UserModel, existing.id)
            if model is None:
                return existing
            model.role = "admin"
            model.name = name
            model.hashed_password = hashed_password
            self._session.commit()
            self._session.refresh(model)
            return self._to_entity(model)
        return self.create(name, email, hashed_password, role="admin")

    @staticmethod
    def _to_entity(model: UserModel) -> UserEntity:
        return UserEntity(
            id=model.id,
            name=model.name,
            email=model.email,
            hashed_password=model.hashed_password,
            role=model.role if model.role in ("user", "admin") else "user",
            created_at=model.created_at,
        )
