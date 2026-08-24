from datetime import UTC, datetime

import pytest

from domain.applications.entities import ApplicationEntity
from domain.applications.use_cases.apply_to_job import ApplyToJobUseCase
from domain.documents.entities import DocumentEntity
from domain.documents.errors import JobClosedError
from domain.documents.use_cases.close_job import CloseJobUseCase
from domain.notifications.errors import NotificationDeliveryError
from domain.offers.entities import OfferEntity
from domain.offers.use_cases.create_offer import CreateOfferUseCase

NOW = datetime(2026, 8, 24, tzinfo=UTC)


def _document(
    document_id: int,
    doc_type: str,
    user_id: int | None,
    *,
    closed: bool = False,
) -> DocumentEntity:
    return DocumentEntity(
        id=document_id,
        type=doc_type,  # type: ignore[arg-type]
        payload={"title": "Backend Engineer", "technologies": ["Python"]},
        source_filename="Backend Engineer",
        status="synced",
        pinecone_id=f"{doc_type}-{document_id}",
        error_message=None,
        created_at=NOW,
        updated_at=NOW,
        user_id=user_id,
        closed_at=NOW if closed else None,
    )


class _Documents:
    def __init__(self, *documents: DocumentEntity):
        self.documents = {document.id: document for document in documents}

    def get_by_id(self, document_id):
        return self.documents.get(document_id)

    def list_by_user(self, user_id, doc_type=None):
        return [
            document
            for document in self.documents.values()
            if document.user_id == user_id
            and (doc_type is None or document.type == doc_type)
        ]

    def close_job(self, document_id):
        document = self.documents[document_id]
        document.closed_at = NOW
        return document


class _Applications:
    def __init__(self, existing=None, by_job=None):
        self.existing = existing
        self.by_job = by_job or []

    def get_by_job_and_applicant(self, _job_id, _applicant_id):
        return self.existing

    def create(self, job_id, resume_id, applicant_id, recruiter_id):
        return ApplicationEntity(
            id=41,
            job_document_id=job_id,
            resume_document_id=resume_id,
            applicant_user_id=applicant_id,
            recruiter_user_id=recruiter_id,
            created_at=NOW,
        )

    def list_by_job(self, _job_id):
        return self.by_job


class _Offers:
    def __init__(self):
        self.existing = None

    def get_by_job_and_professional(self, _job_id, _professional_id):
        return self.existing

    def create(self, **values):
        return OfferEntity(id=51, created_at=NOW, **values)


class _Matcher:
    def __init__(self, resume: DocumentEntity, job: DocumentEntity):
        self.resume = resume
        self.job = job

    def execute(self, _recruiter_id):
        return [
            type("Match", (), {"document": self.resume, "matched_jobs": [self.job]})()
        ]


class _Users:
    def get_by_id(self, user_id):
        return type("User", (), {"id": user_id, "role": "professional"})()


class _Notifications:
    def __init__(self, fail_on_call: int | None = None):
        self.calls: list[dict] = []
        self.fail_on_call = fail_on_call

    def trigger(self, **values):
        self.calls.append(values)
        if self.fail_on_call == len(self.calls):
            raise NotificationDeliveryError("Liveblocks unavailable")


class _Transaction:
    def __init__(self):
        self.committed = False
        self.rolled_back = False

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class _VectorStore:
    def __init__(self):
        self.deleted = None

    def delete(self, ids, namespace):
        self.deleted = (ids, namespace)


def test_application_notifies_recruiter_before_commit() -> None:
    job = _document(1, "job", 10)
    resume = _document(2, "resume", 20)
    notifications = _Notifications()
    transaction = _Transaction()

    application = ApplyToJobUseCase(
        _Documents(job, resume),
        _Applications(),
        notifications,
        transaction,
    ).execute(1, 20, "Ana", 2)

    assert application.id == 41
    assert notifications.calls[0]["user_id"] == 10
    assert notifications.calls[0]["kind"] == "$newApplication"
    assert transaction.committed is True
    assert transaction.rolled_back is False


def test_application_rolls_back_when_notification_fails() -> None:
    notifications = _Notifications(fail_on_call=1)
    transaction = _Transaction()
    use_case = ApplyToJobUseCase(
        _Documents(_document(1, "job", 10), _document(2, "resume", 20)),
        _Applications(),
        notifications,
        transaction,
    )

    with pytest.raises(NotificationDeliveryError):
        use_case.execute(1, 20, "Ana", 2)

    assert transaction.committed is False
    assert transaction.rolled_back is True


def test_closed_job_rejects_application_without_notification() -> None:
    notifications = _Notifications()
    transaction = _Transaction()
    use_case = ApplyToJobUseCase(
        _Documents(
            _document(1, "job", 10, closed=True),
            _document(2, "resume", 20),
        ),
        _Applications(),
        notifications,
        transaction,
    )

    with pytest.raises(JobClosedError):
        use_case.execute(1, 20, "Ana", 2)

    assert notifications.calls == []


def test_offer_notifies_professional_and_commits() -> None:
    notifications = _Notifications()
    transaction = _Transaction()
    offer = CreateOfferUseCase(
        (documents := _Documents(_document(1, "job", 10), _document(2, "resume", 20))),
        _Applications(),
        _Offers(),
        _Matcher(documents.documents[2], documents.documents[1]),
        _Users(),
        notifications,
        transaction,
    ).execute(
        job_id=1,
        resume_document_id=2,
        recruiter_user_id=10,
        recruiter_name="Rafa",
        message="Your Python background looks like a strong fit.",
    )

    assert offer.id == 51
    assert notifications.calls[0]["user_id"] == 20
    assert notifications.calls[0]["kind"] == "$jobOffer"
    assert transaction.committed is True


def test_close_notifies_each_distinct_applicant_then_removes_vector() -> None:
    job = _document(1, "job", 10)
    applications = [
        ApplicationEntity(1, 1, 2, 20, 10, NOW),
        ApplicationEntity(2, 1, 3, 21, 10, NOW),
        ApplicationEntity(3, 1, 4, 20, 10, NOW),
    ]
    notifications = _Notifications()
    transaction = _Transaction()
    vector_store = _VectorStore()

    closed = CloseJobUseCase(
        _Documents(job),
        _Applications(by_job=applications),
        notifications,
        transaction,
        lambda: vector_store,
        "jobs",
    ).execute(1, 10)

    assert closed.closed_at == NOW
    assert [call["user_id"] for call in notifications.calls] == [20, 21]
    assert transaction.committed is True
    assert vector_store.deleted == (["job-1"], "jobs")


def test_close_rolls_back_when_any_applicant_notification_fails() -> None:
    applications = [
        ApplicationEntity(1, 1, 2, 20, 10, NOW),
        ApplicationEntity(2, 1, 3, 21, 10, NOW),
    ]
    transaction = _Transaction()
    use_case = CloseJobUseCase(
        _Documents(_document(1, "job", 10)),
        _Applications(by_job=applications),
        _Notifications(fail_on_call=2),
        transaction,
        lambda: _VectorStore(),
        "jobs",
    )

    with pytest.raises(NotificationDeliveryError):
        use_case.execute(1, 10)

    assert transaction.committed is False
    assert transaction.rolled_back is True
