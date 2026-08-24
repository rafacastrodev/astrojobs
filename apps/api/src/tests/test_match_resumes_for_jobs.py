from datetime import UTC, datetime
from types import SimpleNamespace

from domain.documents.entities import DocumentEntity
from domain.documents.use_cases.match_resumes_for_jobs import MatchResumesForJobsUseCase

NOW = datetime(2026, 8, 24, tzinfo=UTC)


def _doc(
    doc_id: int,
    doc_type: str,
    payload: dict,
    user_id: int | None,
    filename: str = "file.txt",
) -> DocumentEntity:
    return DocumentEntity(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        payload=payload,
        source_filename=filename,
        status="synced",
        pinecone_id=None,
        error_message=None,
        created_at=NOW,
        updated_at=NOW,
        user_id=user_id,
    )


class _Documents:
    def __init__(self, documents: list[DocumentEntity]):
        self._documents = documents

    def list(self, doc_type=None, status=None):
        del status
        return [doc for doc in self._documents if doc_type is None or doc.type == doc_type]


class _Analyses:
    def __init__(self, by_resume: dict[int, object]):
        self._by_resume = by_resume

    def list_latest_general_by_resume_ids(self, resume_ids):
        return {
            resume_id: self._by_resume[resume_id]
            for resume_id in resume_ids
            if resume_id in self._by_resume
        }


def test_matches_resumes_that_share_job_technologies() -> None:
    job = _doc(
        1,
        "job",
        {"title": "Backend", "technologies": ["Python", "FastAPI"]},
        user_id=10,
        filename="Backend",
    )
    python_resume = _doc(
        2,
        "resume",
        {"skills": ["python", "Docker"]},
        user_id=20,
        filename="ana.txt",
    )
    other_resume = _doc(
        3,
        "resume",
        {"skills": ["Java"]},
        user_id=21,
        filename="joao.txt",
    )
    recruiter_upload = _doc(4, "resume", {"skills": ["Python"]}, user_id=None)
    use_case = MatchResumesForJobsUseCase(
        _Documents([job, python_resume, other_resume, recruiter_upload]),
        _Analyses({}),
    )
    matches = use_case.execute(recruiter_id=10)
    assert [item.document.id for item in matches] == [2]
    assert matches[0].matched_technologies == ["Python"]
    assert matches[0].score == 0.5


def test_uses_analysis_technologies_when_payload_has_none() -> None:
    job = _doc(1, "job", {"title": "Backend", "technologies": ["FastAPI"]}, user_id=10)
    resume = _doc(2, "resume", {"summary": "Engineer"}, user_id=20)
    analysis = SimpleNamespace(technologies=["FastAPI"], summary="Strong API background")
    matches = MatchResumesForJobsUseCase(
        _Documents([job, resume]),
        _Analyses({2: analysis}),
    ).execute(recruiter_id=10)
    assert len(matches) == 1
    assert matches[0].matched_technologies == ["FastAPI"]
    assert matches[0].summary == "Strong API background"


def test_returns_empty_when_recruiter_has_no_jobs() -> None:
    other_job = _doc(1, "job", {"title": "Backend", "technologies": ["Python"]}, user_id=99)
    resume = _doc(2, "resume", {"skills": ["Python"]}, user_id=20)
    matches = MatchResumesForJobsUseCase(
        _Documents([other_job, resume]),
        _Analyses({}),
    ).execute(recruiter_id=10)
    assert matches == []


def test_filters_out_resumes_that_miss_job_seniority() -> None:
    job = _doc(
        1,
        "job",
        {
            "title": "Backend",
            "technologies": ["Python"],
            "seniority": "senior",
            "work_mode": "on-site",
            "region": "São Paulo",
            "employment_type": "full-time",
        },
        user_id=10,
    )
    junior = _doc(
        2,
        "resume",
        {"skills": ["Python"], "seniority": "junior"},
        user_id=20,
    )
    senior = _doc(
        3,
        "resume",
        {
            "skills": ["Python"],
            "seniority": "senior",
            "experiences": [{"location": "São Paulo"}],
        },
        user_id=21,
    )
    matches = MatchResumesForJobsUseCase(
        _Documents([job, junior, senior]),
        _Analyses({}),
    ).execute(recruiter_id=10)
    assert [item.document.id for item in matches] == [3]


def test_remote_jobs_do_not_require_region() -> None:
    job = _doc(
        1,
        "job",
        {
            "title": "Backend",
            "technologies": ["Python"],
            "work_mode": "remote",
            "region": "Lisboa",
        },
        user_id=10,
    )
    resume = _doc(
        2,
        "resume",
        {"skills": ["Python"], "experiences": [{"location": "Recife"}]},
        user_id=20,
    )
    matches = MatchResumesForJobsUseCase(
        _Documents([job, resume]),
        _Analyses({}),
    ).execute(recruiter_id=10)
    assert [item.document.id for item in matches] == [2]
