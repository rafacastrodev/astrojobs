from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.users.entities import UserEntity
from domain.users.errors import EmailAlreadyExistsError, UsernameAlreadyExistsError
from infrastructure.database.config import Settings
from infrastructure.documents.dependencies import (
    get_delete_document_use_case,
    get_document_use_case,
    get_list_documents_use_case,
)
from infrastructure.users.dependencies import get_signup_use_case, require_recruiter
from main.admin_router import router as recruiter_router
from main.auth_router import router as auth_router

NOW = datetime(2026, 8, 24, tzinfo=UTC)
RECRUITER_ID = 10


def _user() -> UserEntity:
    return UserEntity(
        RECRUITER_ID,
        "hireflow",
        "hire@example.com",
        "hashed",
        "recruiter",
        NOW,
    )


def _doc(doc_id: int, doc_type: str, user_id: int, status: str = "draft") -> DocumentEntity:
    return DocumentEntity(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        payload={"full_text": "secret resume", "contact": {"phones": ["+55 11 90000-0000"]}},
        source_filename="rafael_castro_full_stack_engineer.pdf",
        status=status,  # type: ignore[arg-type]
        pinecone_id=None,
        error_message=None,
        created_at=NOW,
        updated_at=NOW,
        user_id=user_id,
    )


class _ListDocuments:
    def __init__(self, documents: list[DocumentEntity]) -> None:
        self.documents = documents

    def execute(self, doc_type=None, status=None):
        del status
        return [
            document
            for document in self.documents
            if doc_type is None or document.type == doc_type
        ]


class _GetDocument:
    def __init__(self, documents: list[DocumentEntity]) -> None:
        self._by_id = {document.id: document for document in documents}

    def execute(self, document_id: int) -> DocumentEntity:
        document = self._by_id.get(document_id)
        if document is None:
            raise DocumentNotFoundError(f"Document {document_id} not found")
        return document


class _DeleteDocument:
    def __init__(self) -> None:
        self.deleted: list[int] = []

    def execute(self, document_id: int) -> None:
        self.deleted.append(document_id)


class _Signup:
    def execute(self, username: str, email: str, password: str, role: str):
        del password, role
        if email == "taken@example.com":
            raise EmailAlreadyExistsError(email)
        if username == "taken":
            raise UsernameAlreadyExistsError(username)
        raise AssertionError("unexpected signup")


def _recruiter_client(
    documents: list[DocumentEntity],
    delete: _DeleteDocument | None = None,
) -> tuple[TestClient, _DeleteDocument]:
    delete = delete or _DeleteDocument()
    app = FastAPI()
    app.include_router(recruiter_router)
    app.dependency_overrides[require_recruiter] = _user
    app.dependency_overrides[get_list_documents_use_case] = lambda: _ListDocuments(
        documents
    )
    app.dependency_overrides[get_document_use_case] = lambda: _GetDocument(documents)
    app.dependency_overrides[get_delete_document_use_case] = lambda: delete
    return TestClient(app), delete


def _signup_client() -> TestClient:
    app = FastAPI()
    app.include_router(auth_router)
    app.dependency_overrides[get_signup_use_case] = lambda: _Signup()
    return TestClient(app)


def _production_settings(**kwargs) -> Settings:
    return Settings(
        _env_file=None,
        jwt_secret="test-secret",
        environment="production",
        postgres_host="db.example",
        pinecone_api_key="pc-key",
        pinecone_index_name="astrojobs",
        **kwargs,
    )


def test_sec01_recruiter_cannot_delete_someone_elses_resume() -> None:
    resume = _doc(99, "resume", 20)
    client, delete = _recruiter_client([resume, _doc(1, "job", RECRUITER_ID)])

    response = client.delete("/recruiter/documents/99")

    assert response.status_code == 404
    assert delete.deleted == []


def test_sec02_recruiter_cannot_list_or_read_global_resumes() -> None:
    resume = _doc(99, "resume", 20)
    own_job = _doc(1, "job", RECRUITER_ID)
    other_job = _doc(2, "job", 11)
    client, _ = _recruiter_client([resume, own_job, other_job])

    listed_resumes = client.get("/recruiter/documents", params={"type": "resume"})
    listed_all = client.get("/recruiter/documents")
    fetched_resume = client.get("/recruiter/documents/99")
    fetched_other_job = client.get("/recruiter/documents/2")

    assert listed_resumes.status_code == 200
    assert listed_resumes.json() == []
    assert [item["id"] for item in listed_all.json()] == [1]
    assert fetched_resume.status_code == 404
    assert fetched_other_job.status_code == 404
    assert "secret resume" not in fetched_resume.text
    assert "+55 11 90000-0000" not in fetched_resume.text


def test_sec03_production_does_not_use_dev_posture() -> None:
    settings = _production_settings(cookie_secure=False)

    assert settings.is_development is False
    assert settings.uses_pgvector is False
    assert "http://localhost" not in settings.cors_allow_origins
    assert "http://127.0.0.1" not in settings.cors_allow_origins


def test_sec04_production_hides_openapi_docs() -> None:
    server = (Path(__file__).resolve().parents[1] / "main" / "server.py").read_text()
    assert 'docs_url="/docs" if settings.is_development else None' in server
    assert 'redoc_url="/redoc" if settings.is_development else None' in server
    assert 'openapi_url="/openapi.json" if settings.is_development else None' in server

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    client = TestClient(app)

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_sec05_production_forces_secure_auth_cookie() -> None:
    settings = _production_settings(cookie_secure=False)
    assert settings.cookie_secure is True


def test_sec06_signup_does_not_reveal_which_field_is_taken() -> None:
    client = _signup_client()
    email_conflict = client.post(
        "/auth/signup",
        json={
            "username": "newuser",
            "email": "taken@example.com",
            "password": "Password123",
            "role": "professional",
        },
    )
    username_conflict = client.post(
        "/auth/signup",
        json={
            "username": "taken",
            "email": "fresh@example.com",
            "password": "Password123",
            "role": "professional",
        },
    )

    assert email_conflict.status_code == 409
    assert username_conflict.status_code == 409
    assert email_conflict.json()["detail"] == "Could not create this account"
    assert username_conflict.json()["detail"] == email_conflict.json()["detail"]
    assert "Email already in use" not in email_conflict.text
    assert "Username already in use" not in username_conflict.text
