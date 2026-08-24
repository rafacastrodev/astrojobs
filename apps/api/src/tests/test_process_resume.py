from datetime import UTC, datetime

import pytest

from domain.analysis.entities import AnalysisEntity
from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.documents.use_cases.process_resume import ProcessResumeUseCase


def _resume(user_id=7, analysis_status="completed", status="synced"):
    now = datetime.now(UTC)
    return DocumentEntity(
        id=1,
        type="resume",
        payload={"summary": "Engineer"},
        source_filename="resume.txt",
        status=status,
        pinecone_id="resume-1" if status == "synced" else None,
        error_message=None,
        created_at=now,
        updated_at=now,
        user_id=user_id,
        analysis_status=analysis_status,
    )


def _analysis():
    return AnalysisEntity(
        id=1,
        user_id=7,
        resume_document_id=1,
        job_source="none",
        job_document_id=None,
        job_title=None,
        score=80,
        summary="Good",
        findings=["Add metrics"],
        years_of_experience=3,
        technologies=["Python"],
        companies=[],
        created_at=datetime.now(UTC),
        ats_category="high",
    )


class _Documents:
    def __init__(self, resume):
        self.resume = resume

    def get_by_id(self, _document_id):
        return self.resume

    def mark_failed(self, _document_id, message):
        self.resume.status = "failed"
        self.resume.error_message = message
        return self.resume


class _Analyses:
    def __init__(self, analysis):
        self.analysis = analysis

    def get_latest_general(self, *_args):
        return self.analysis


class _Analyze:
    def __init__(self, result):
        self.calls = 0
        self.result = result

    def execute(self, **_kwargs):
        self.calls += 1
        return self.result


class _Sync:
    def __init__(self):
        self.calls = 0

    def execute(self, _ids):
        self.calls += 1


def test_process_is_idempotent_when_everything_is_complete():
    resume = _resume()
    analysis = _analysis()
    analyze = _Analyze(analysis)
    sync = _Sync()
    use_case = ProcessResumeUseCase(
        _Documents(resume), _Analyses(analysis), analyze, sync
    )

    result_resume, result_analysis = use_case.execute(1, 7)

    assert result_resume is resume
    assert result_analysis is analysis
    assert analyze.calls == 0
    assert sync.calls == 0


def test_process_rejects_a_resume_owned_by_another_user():
    resume = _resume(user_id=8)
    use_case = ProcessResumeUseCase(
        _Documents(resume), _Analyses(None), _Analyze(_analysis()), _Sync()
    )

    with pytest.raises(DocumentNotFoundError):
        use_case.execute(1, 7)
