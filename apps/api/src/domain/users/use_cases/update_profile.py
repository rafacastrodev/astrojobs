from typing import Any

from domain.users.entities import OnboardingStatus, UserEntity
from domain.users.profile import canonical_profile_region, validate_salary_range
from domain.users.repository import UserRepository


class UpdateProfileUseCase:
    def __init__(self, user_repository: UserRepository):
        self._users = user_repository

    def execute(self, user: UserEntity, updates: dict[str, Any]) -> UserEntity:
        company = updates["company"] if "company" in updates else user.company
        job_title = updates["job_title"] if "job_title" in updates else user.job_title
        if "region" in updates:
            region = canonical_profile_region(updates["region"], required=False)
        else:
            region = user.region
        salary_min_usd = (
            updates["salary_min_usd"]
            if "salary_min_usd" in updates
            else user.salary_min_usd
        )
        salary_max_usd = (
            updates["salary_max_usd"]
            if "salary_max_usd" in updates
            else user.salary_max_usd
        )
        validate_salary_range(salary_min_usd, salary_max_usd)
        onboarding_status: OnboardingStatus = user.onboarding_status
        requested_status = updates.get("onboarding_status")
        if user.role == "professional" and requested_status in ("skipped", "completed"):
            onboarding_status = requested_status
        updated = self._users.update_profile(
            user.id,
            company=company,
            job_title=job_title,
            region=region,
            salary_min_usd=salary_min_usd,
            salary_max_usd=salary_max_usd,
            onboarding_status=onboarding_status,
        )
        return updated or user
