from datetime import datetime

from sqlalchemy.orm import Session

from domain.users.password_reset_token_entity import PasswordResetTokenEntity
from infrastructure.models.password_reset_token_model import PasswordResetTokenModel


class SqlAlchemyPasswordResetTokenRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self, user_id: int, token_hash: str, expires_at: datetime
    ) -> PasswordResetTokenEntity:
        model = PasswordResetTokenModel(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def get_valid_by_token_hash(self, token_hash: str) -> PasswordResetTokenEntity | None:
        model = (
            self._session.query(PasswordResetTokenModel)
            .filter(
                PasswordResetTokenModel.token_hash == token_hash,
                PasswordResetTokenModel.used_at.is_(None),
                PasswordResetTokenModel.expires_at > datetime.utcnow(),
            )
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def mark_used(self, token_id: int) -> None:
        model = self._session.get(PasswordResetTokenModel, token_id)
        if model is None:
            return
        model.used_at = datetime.utcnow()
        self._session.commit()

    @staticmethod
    def _to_entity(model: PasswordResetTokenModel) -> PasswordResetTokenEntity:
        return PasswordResetTokenEntity(
            id=model.id,
            user_id=model.user_id,
            token_hash=model.token_hash,
            expires_at=model.expires_at,
            used_at=model.used_at,
        )
