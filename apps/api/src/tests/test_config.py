import os

import pytest
from pydantic import ValidationError

from infrastructure.database.config import Settings, _drop_empty_libpq_env

_ACCESS_POINT = "arn:aws:s3:us-east-1:956112822284:accesspoint/astrojobs-s3-access"


def _settings(**kwargs) -> Settings:
    return Settings(_env_file=None, jwt_secret="test-secret", **kwargs)


def test_docker_uses_compose_postgres_hostname(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: True
    )
    assert _settings(postgres_host="postgres").postgres_host == "postgres"


def test_docker_rewrites_localhost_and_db_to_postgres(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: True
    )
    for host in (None, "localhost", "db"):
        assert _settings(postgres_host=host).postgres_host == "postgres"


def test_host_rewrites_compose_aliases_to_localhost(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: False
    )
    for host in ("postgres", "db"):
        assert _settings(postgres_host=host).postgres_host == "localhost"


def test_empty_pgsslmode_is_removed_from_the_process_environment(monkeypatch):
    monkeypatch.setenv("PGSSLMODE", "")
    monkeypatch.setenv("PGSSLROOTCERT", "   ")
    _drop_empty_libpq_env()
    assert "PGSSLMODE" not in os.environ
    assert "PGSSLROOTCERT" not in os.environ


def test_set_pgsslmode_is_kept(monkeypatch):
    monkeypatch.setenv("PGSSLMODE", "verify-full")
    _drop_empty_libpq_env()
    assert os.environ["PGSSLMODE"] == "verify-full"


def test_s3_access_point_arn_is_not_used_as_endpoint(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: True
    )
    settings = _settings(
        environment="development",
        aws_s3_bucket="astrojobs-s3",
        aws_s3_endpoint_url=_ACCESS_POINT,
        aws_access_key_id="AKIAEXAMPLE",
        aws_secret_access_key="secret",
    )
    assert settings.aws_s3_endpoint_url == ""
    assert settings.aws_s3_bucket == "astrojobs-s3"


def test_development_keeps_real_s3_when_bucket_is_set(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: True
    )
    settings = _settings(
        environment="development",
        aws_s3_bucket="astrojobs-s3",
        aws_s3_endpoint_url="",
        aws_access_key_id="AKIAEXAMPLE",
        aws_secret_access_key="secret",
    )
    assert settings.aws_s3_bucket == "astrojobs-s3"
    assert settings.aws_s3_endpoint_url == ""


def test_development_uses_pgvector():
    assert _settings(environment="development").uses_pgvector is True


def test_gemini_model_uses_google_openai_compat_url():
    settings = _settings(gemini_api_key="gemini-key")
    assert settings.uses_gemini is True
    assert settings.llm_api_key == "gemini-key"
    assert settings.llm_model == "gemini-3.6-flash"
    assert "generativelanguage.googleapis.com" in settings.llm_base_url


def test_explicit_llm_settings_win_over_legacy_keys():
    settings = _settings(
        llm_api_key="explicit-key",
        llm_model="gpt-5.4-nano",
        gemini_api_key="gemini-key",
        openai_api_key="openai-key",
    )
    assert settings.llm_api_key == "explicit-key"
    assert settings.llm_model == "gpt-5.4-nano"
    assert settings.uses_gemini is False
    assert settings.llm_is_openai is True


def test_agentcore_gateway_url_enables_kb_retrieval():
    settings = _settings(
        agentcore_gateway_url=(
            "https://astrojobs-gateway-kxdyk0xerk.gateway."
            "bedrock-agentcore.us-east-1.amazonaws.com/mcp"
        ),
        aws_bedrock_gateway_target="astrojobs-target",
    )
    assert settings.uses_agentcore_gateway is True
    assert settings.agentcore_retrieve_tool == "astrojobs-target___Retrieve"


def test_production_does_not_use_pgvector():
    assert (
        _settings(
            environment="production",
            postgres_host="db.example",
            pinecone_api_key="pc-key",
            pinecone_index_name="astrojobs",
        ).uses_pgvector
        is False
    )


def test_production_requires_pinecone():
    with pytest.raises(ValidationError, match="PINECONE"):
        _settings(environment="production", postgres_host="db.example")


def test_production_forces_secure_cookies():
    settings = _settings(
        environment="production",
        postgres_host="db.example",
        pinecone_api_key="pc-key",
        pinecone_index_name="astrojobs",
        cookie_secure=False,
    )
    assert settings.cookie_secure is True


def test_development_defaults_to_localstack_only_without_real_s3(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.database.config._running_in_docker", lambda: False
    )
    settings = _settings(
        environment="development",
        aws_s3_bucket="",
        aws_s3_endpoint_url="",
    )
    assert settings.aws_s3_bucket == "astrojobs-resumes"
    assert settings.aws_s3_endpoint_url == "http://localhost:4566"


def test_strips_quoted_aws_region_and_bucket():
    settings = _settings(
        environment="development",
        aws_region='"us-east-1"',
        aws_s3_bucket='"astrojobs-s3"',
        aws_s3_endpoint_url="",
        aws_access_key_id="AKIATESTKEY000000001",
        aws_secret_access_key="testsecret",
    )
    assert settings.aws_region == "us-east-1"
    assert settings.aws_s3_bucket == "astrojobs-s3"


def test_keeps_dotenv_key_pair_when_shell_only_has_a_secret(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "AWS_ACCESS_KEY_ID=AKIADOENVFILEKEY0001\n"
        "AWS_SECRET_ACCESS_KEY=dotenvsecretvalue00000000000000000001\n"
    )
    monkeypatch.setattr("infrastructure.database.config.ENV_FILE", env_file)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.setenv(
        "AWS_SECRET_ACCESS_KEY", "shellsecretvalue00000000000000000002"
    )
    settings = Settings(
        _env_file=env_file,
        jwt_secret="test-secret",
        environment="development",
        aws_s3_bucket="astrojobs-s3",
    )
    assert settings.aws_access_key_id == "AKIADOENVFILEKEY0001"
    assert settings.aws_secret_access_key == "dotenvsecretvalue00000000000000000001"
