from dataclasses import dataclass
from datetime import datetime
from typing import Literal

UserRole = Literal["professional", "recruiter"]
OnboardingStatus = Literal["pending", "skipped", "completed"]


@dataclass
class UserEntity:
    id: int
    name: str
    email: str
    # None for social-only accounts, which cannot sign in with a password.
    hashed_password: str | None
    role: UserRole
    created_at: datetime
    photo_key: str | None = None
    company: str | None = None
    job_title: str | None = None
    region: str | None = None
    salary_min_usd: int | None = None
    salary_max_usd: int | None = None
    onboarding_status: OnboardingStatus = "completed"
