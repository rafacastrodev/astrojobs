from domain.documents.region_catalog import canonical_region
from domain.users.entities import OnboardingStatus


def canonical_profile_region(value: str | None, *, required: bool) -> str | None:
    if value is None or not str(value).strip():
        if required:
            raise ValueError("Choose a region from the catalog")
        return None
    canonical = canonical_region(value)
    if canonical is None:
        raise ValueError("Choose a region from the catalog")
    return canonical


def initial_onboarding_status(
    role: str,
    job_title: str | None,
    region: str | None,
) -> OnboardingStatus:
    if role != "professional":
        return "completed"
    if (job_title or "").strip() and (region or "").strip():
        return "completed"
    return "pending"


def validate_salary_range(
    salary_min_usd: int | None, salary_max_usd: int | None
) -> None:
    for amount in (salary_min_usd, salary_max_usd):
        if amount is not None and amount < 0:
            raise ValueError("Salary must be zero or greater")
    if (
        salary_min_usd is not None
        and salary_max_usd is not None
        and salary_min_usd > salary_max_usd
    ):
        raise ValueError("Maximum salary must be at least the minimum")
