from infrastructure.schemas.user_schemas import SignupRequest


def test_professional_signup_does_not_require_profile_fields() -> None:
    user = SignupRequest(
        username="ana",
        email="ana@example.com",
        password="password1",
        role="professional",
    )
    assert user.company is None
    assert user.job_title is None
    assert user.region is None
    assert user.salary_min_usd is None


def test_professional_signup_still_accepts_optional_profile_fields() -> None:
    user = SignupRequest(
        username="ana",
        email="ana@example.com",
        password="password1",
        role="professional",
        company="Nubank",
        job_title="Backend Engineer",
        region="Sao Paulo",
        salary_min_usd=80000,
        salary_max_usd=120000,
    )
    assert user.job_title == "Backend Engineer"
    assert user.region == "Sao Paulo"


def test_recruiter_signup_does_not_require_professional_profile() -> None:
    user = SignupRequest(
        username="hire",
        email="hire@example.com",
        password="password1",
        role="recruiter",
    )
    assert user.company is None
    assert user.region is None
