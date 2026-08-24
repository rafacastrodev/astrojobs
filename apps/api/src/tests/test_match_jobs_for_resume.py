from datetime import UTC, datetime
from types import SimpleNamespace

from domain.documents.entities import DocumentEntity
from domain.documents.use_cases.match_jobs_for_resume import MatchJobsForResumeUseCase

NOW = datetime(2026, 8, 24, tzinfo=UTC)


def _doc(
    doc_id: int, doc_type: str, payload: dict, user_id: int | None
) -> DocumentEntity:
    return DocumentEntity(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        payload=payload,
        source_filename="file",
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

    def get_by_id(self, document_id):
        return next((doc for doc in self._documents if doc.id == document_id), None)

    def list(self, doc_type=None, status=None):
        del status
        return [
            doc for doc in self._documents if doc_type is None or doc.type == doc_type
        ]

    def list_by_user(self, user_id, doc_type=None):
        return [
            doc
            for doc in self._documents
            if doc.user_id == user_id and (doc_type is None or doc.type == doc_type)
        ]


class _Analyses:
    def __init__(self, by_resume: dict[int, object] | None = None):
        self._by_resume = by_resume or {}

    def get_latest_general(self, resume_id, _user_id):
        return self._by_resume.get(resume_id)

    def list_latest_general_by_resume_ids(self, resume_ids):
        return {
            resume_id: self._by_resume[resume_id]
            for resume_id in resume_ids
            if resume_id in self._by_resume
        }


class _Semantic:
    def __init__(self, scores: dict[int, float]):
        self._scores = scores

    def rank(self, _payload, _doc_type, _candidates):
        return self._scores


def test_ranks_jobs_by_technology_overlap() -> None:
    python_job = _doc(
        1, "job", {"title": "Backend", "technologies": ["Python", "FastAPI"]}, 10
    )
    java_job = _doc(2, "job", {"title": "Java", "technologies": ["Java"]}, 10)
    resume = _doc(3, "resume", {"skills": ["Python"]}, 20)
    matches = MatchJobsForResumeUseCase(
        _Documents([python_job, java_job, resume]), _Analyses()
    ).execute(3, 20, top_k=10)
    assert [item.document.id for item in matches] == [1]
    assert matches[0].score == 0.5
    assert matches[0].matched_technologies == ["Python"]


def test_lists_all_jobs_for_a_user_with_unmatched_last() -> None:
    python_job = _doc(1, "job", {"title": "Backend", "technologies": ["Python"]}, 10)
    java_job = _doc(2, "job", {"title": "Java", "technologies": ["Java"]}, 11)
    resume = _doc(3, "resume", {"skills": ["Python"]}, 20)
    matches = MatchJobsForResumeUseCase(
        _Documents([python_job, java_job, resume]),
        _Analyses(),
    ).execute_for_user(20)
    assert [item.document.id for item in matches] == [1, 2]
    assert matches[0].score == 1.0
    assert matches[1].score == 0.0


def test_uses_analysis_technologies() -> None:
    job = _doc(1, "job", {"title": "Backend", "technologies": ["FastAPI"]}, 10)
    resume = _doc(3, "resume", {"summary": "Engineer"}, 20)
    analysis = SimpleNamespace(technologies=["FastAPI"], years_of_experience=None)
    matches = MatchJobsForResumeUseCase(
        _Documents([job, resume]),
        _Analyses({3: analysis}),
    ).execute(3, 20)
    assert matches[0].score == 1.0


def test_uses_technologies_mentioned_in_resume_full_text() -> None:
    job = _doc(
        1,
        "job",
        {"title": "Full stack", "technologies": ["Python", "Django", "React"]},
        10,
    )
    resume = _doc(
        3,
        "resume",
        {
            "skills": [],
            "full_text": "Built Python APIs with Django and React applications.",
        },
        20,
    )
    matches = MatchJobsForResumeUseCase(
        _Documents([job, resume]),
        _Analyses(),
    ).execute(3, 20)
    assert matches[0].score == 1.0
    assert matches[0].matched_technologies == ["Django", "Python", "React"]


def test_normalizes_technology_aliases() -> None:
    job = _doc(1, "job", {"title": "Data", "technologies": ["PostgreSQL"]}, 10)
    resume = _doc(3, "resume", {"skills": ["postgres"]}, 20)
    matches = MatchJobsForResumeUseCase(
        _Documents([job, resume]),
        _Analyses(),
    ).execute(3, 20)
    assert matches[0].score == 1.0
    assert matches[0].matched_technologies == ["PostgreSQL"]


def test_does_not_treat_past_work_conditions_as_candidate_preferences() -> None:
    job = _doc(
        1,
        "job",
        {
            "title": "Backend",
            "technologies": ["Python"],
            "work_mode": "remote",
            "employment_type": "full-time",
        },
        10,
    )
    resume = _doc(
        3,
        "resume",
        {
            "skills": [],
            "full_text": "Python engineer. Previous on-site contract position.",
        },
        20,
    )
    matches = MatchJobsForResumeUseCase(
        _Documents([job, resume]),
        _Analyses(),
    ).execute(3, 20)
    assert matches[0].score == 1.0


def test_semantic_relevance_surfaces_adjacent_experience_without_exact_keyword() -> (
    None
):
    job = _doc(
        1,
        "job",
        {"title": "ML Engineer", "technologies": ["TensorFlow"]},
        10,
    )
    resume = _doc(
        3,
        "resume",
        {"summary": "Built and deployed production machine learning models"},
        20,
    )
    matches = MatchJobsForResumeUseCase(
        _Documents([job, resume]),
        _Analyses(),
        _Semantic({1: 0.8}),
    ).execute(3, 20)

    assert [item.document.id for item in matches] == [1]
    assert round(matches[0].score, 2) == 0.28
    assert matches[0].matched_technologies == []
