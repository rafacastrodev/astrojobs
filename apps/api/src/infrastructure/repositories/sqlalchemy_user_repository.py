from sqlalchemy.orm import Session

from domain.users.entities import OnboardingStatus, UserEntity
from domain.users.profile import initial_onboarding_status
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
            self._session.query(UserModel).filter(UserModel.name == name).one_or_none()
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
        company: str | None = None,
        job_title: str | None = None,
        region: str | None = None,
        salary_min_usd: int | None = None,
        salary_max_usd: int | None = None,
        onboarding_status: str | None = None,
    ) -> UserEntity:
        model = UserModel(
            name=name,
            email=email,
            hashed_password=hashed_password,
            role=role,
            company=company,
            job_title=job_title,
            region=region,
            salary_min_usd=salary_min_usd,
            salary_max_usd=salary_max_usd,
            onboarding_status=onboarding_status
            or initial_onboarding_status(role, job_title, region),
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
            onboarding_status="pending",
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

    def update_profile(
        self,
        user_id: int,
        *,
        company: str | None,
        job_title: str | None,
        region: str | None,
        salary_min_usd: int | None,
        salary_max_usd: int | None,
        onboarding_status: str | None = None,
    ) -> UserEntity | None:
        model = self._session.get(UserModel, user_id)
        if model is None:
            return None
        model.company = company
        model.job_title = job_title
        model.region = region
        model.salary_min_usd = salary_min_usd
        model.salary_max_usd = salary_max_usd
        if onboarding_status is not None:
            model.onboarding_status = onboarding_status
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def ensure_recruiter(
        self, name: str, email: str, hashed_password: str
    ) -> UserEntity:
        existing = self.get_by_email(email)
        if existing is not None:
            model = self._session.get(UserModel, existing.id)
            if model is None:
                return existing
            model.role = "recruiter"
            model.name = name
            model.hashed_password = hashed_password
            model.onboarding_status = "completed"
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
            company=model.company,
            job_title=model.job_title,
            region=model.region,
            salary_min_usd=model.salary_min_usd,
            salary_max_usd=model.salary_max_usd,
            onboarding_status=_onboarding_status(model.onboarding_status),
        )


def _onboarding_status(value: str | None) -> OnboardingStatus:
    if value in ("pending", "skipped", "completed"):
        return value
    return "completed"
