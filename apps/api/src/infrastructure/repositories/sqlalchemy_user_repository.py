from sqlalchemy.orm import Session

from domain.users.entities import UserEntity
from infrastructure.models.user_model import UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: Session):
        self._session = session

    def get_by_email(self, email: str) -> UserEntity | None:
        model = (
            self._session.query(UserModel)
            .filter(UserModel.email == email)
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def get_by_name(self, name: str) -> UserEntity | None:
        model = (
            self._session.query(UserModel)
            .filter(UserModel.name == name)
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def get_by_id(self, user_id: int) -> UserEntity | None:
        model = self._session.get(UserModel, user_id)
        return self._to_entity(model) if model else None

    def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str = "professional",
    ) -> UserEntity:
        model = UserModel(
            name=name, email=email, hashed_password=hashed_password, role=role
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def create_social(
        self,
        name: str,
        email: str,
    ) -> UserEntity:
        model = UserModel(
            name=name,
            email=email,
            hashed_password=None,
            role="professional",
        )
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

    def update_photo_key(
        self, user_id: int, photo_key: str | None
    ) -> UserEntity | None:
        model = self._session.get(UserModel, user_id)
        if model is None:
            return None
        model.photo_key = photo_key
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def ensure_recruiter(self, name: str, email: str, hashed_password: str) -> UserEntity:
        existing = self.get_by_email(email)
        if existing is not None:
            model = self._session.get(UserModel, existing.id)
            if model is None:
                return existing
            model.role = "recruiter"
            model.name = name
            model.hashed_password = hashed_password
            self._session.commit()
            self._session.refresh(model)
            return self._to_entity(model)
        return self.create(name, email, hashed_password, role="recruiter")

    @staticmethod
    def _to_entity(model: UserModel) -> UserEntity:
        role = {"user": "professional", "admin": "recruiter"}.get(
            model.role, model.role
        )
        if role not in ("professional", "recruiter"):
            role = "professional"
        return UserEntity(
            id=model.id,
            name=model.name,
            email=model.email,
            hashed_password=model.hashed_password,
            role=role,
            created_at=model.created_at,
            photo_key=model.photo_key,
        )
