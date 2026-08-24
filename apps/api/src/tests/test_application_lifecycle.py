from datetime import UTC, datetime

import pytest

from domain.applications.entities import ApplicationEntity
from domain.applications.errors import (
    ApplicationNotFoundError,
    InvalidApplicationTransitionError,
)
from domain.applications.use_cases.update_application_status import (
    UpdateApplicationStatusUseCase,
)
from domain.documents.entities import DocumentEntity
from domain.notifications.errors import NotificationDeliveryError

NOW = datetime(2026, 8, 24, tzinfo=UTC)


def _application(status="submitted", recruiter_id=10):
    return ApplicationEntity(
        id=41,
        job_document_id=1,
        resume_document_id=2,
        applicant_user_id=20,
        recruiter_user_id=recruiter_id,
        created_at=NOW,
        status=status,
        updated_at=NOW,
    )


class _Applications:
    def __init__(self, application):
        self.application = application
        self.updates = []

    def get_by_id(self, _application_id):
        return self.application

    def update_status(self, application_id, status, changed_by_user_id):
        self.updates.append((application_id, status, changed_by_user_id))
        self.application.status = status
        return self.application


class _Documents:
    def get_by_id(self, _document_id):
        return DocumentEntity(
            id=1,
            type="job",
            payload={"title": "Backend Engineer"},
            source_filename="Backend Engineer",
            status="synced",
            pinecone_id="job-1",
            error_message=None,
            created_at=NOW,
            updated_at=NOW,
            user_id=10,
        )


class _Notifications:
    def __init__(self, fail=False):
        self.calls = []
        self.fail = fail

    def trigger(self, **values):
        self.calls.append(values)
        if self.fail:
            raise NotificationDeliveryError("Liveblocks unavailable")


class _Transaction:
    def __init__(self):
        self.committed = False
        self.rolled_back = False

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


def _use_case(application, *, notification_failure=False):
    applications = _Applications(application)
    notifications = _Notifications(notification_failure)
    transaction = _Transaction()
    return (
        UpdateApplicationStatusUseCase(
            applications, _Documents(), notifications, transaction
        ),
        applications,
        notifications,
        transaction,
    )


def test_fun03_recruiter_can_reject_and_notify() -> None:
    use_case, applications, notifications, _ = _use_case(_application("reviewing"))

    updated = use_case.execute(41, 10, "Recruiter", "rejected")

    assert updated.status == "rejected"
    assert applications.updates == [(41, "rejected", 10)]
    assert notifications.calls[0]["activity_data"]["status"] == "rejected"


def test_recruiter_moves_application_to_reviewing_and_notifies_professional():
    use_case, applications, notifications, transaction = _use_case(_application())

    updated = use_case.execute(41, 10, "Recruiter", "reviewing")

    assert updated.status == "reviewing"
    assert applications.updates == [(41, "reviewing", 10)]
    assert notifications.calls == [
        {
            "user_id": 20,
            "kind": "$applicationStatusChanged",
            "subject_id": "application-status-41-reviewing",
            "activity_data": {
                "applicationId": 41,
                "jobId": 1,
                "jobTitle": "Backend Engineer",
                "recruiterName": "Recruiter",
                "status": "reviewing",
            },
        }
    ]
    assert transaction.committed is True
    assert transaction.rolled_back is False


def test_removed_is_a_terminal_application_status():
    use_case, applications, _, _ = _use_case(_application("reviewing"))

    removed = use_case.execute(41, 10, "Recruiter", "removed")

    assert removed.status == "removed"
    with pytest.raises(InvalidApplicationTransitionError):
        use_case.execute(41, 10, "Recruiter", "reviewing")
    assert len(applications.updates) == 1


def test_terminal_decision_cannot_be_changed():
    use_case, applications, _, transaction = _use_case(_application("accepted"))

    with pytest.raises(InvalidApplicationTransitionError):
        use_case.execute(41, 10, "Recruiter", "rejected")

    assert applications.updates == []
    assert transaction.committed is False


def test_another_recruiter_cannot_update_the_application():
    use_case, applications, _, _ = _use_case(_application())

    with pytest.raises(ApplicationNotFoundError):
        use_case.execute(41, 99, "Intruder", "reviewing")

    assert applications.updates == []


def test_status_change_rolls_back_when_notification_fails():
    use_case, _, _, transaction = _use_case(
        _application(), notification_failure=True
    )

    with pytest.raises(NotificationDeliveryError):
        use_case.execute(41, 10, "Recruiter", "reviewing")

    assert transaction.committed is False
    assert transaction.rolled_back is True
