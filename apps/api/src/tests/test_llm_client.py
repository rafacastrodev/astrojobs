import json
from types import SimpleNamespace

import httpx
from pydantic import BaseModel, ConfigDict

from infrastructure.openai_errors import caused_by_llm_unavailability
from infrastructure.services import llm_client


class _Ping(BaseModel):
    model_config = ConfigDict(extra="forbid")

    word: str


def test_gemini_parse_uses_native_generate_content(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": '{"word":"ok"}'}]}}]},
        )

    monkeypatch.setattr(
        llm_client,
        "settings",
        SimpleNamespace(
            uses_gemini=True,
            llm_is_openai=False,
            llm_model="gemini-3.6-flash",
            llm_api_key="test-key",
            openai_timeout_seconds=20,
        ),
    )
    real_client = httpx.Client

    monkeypatch.setattr(
        llm_client.httpx,
        "Client",
        lambda **kwargs: real_client(
            transport=httpx.MockTransport(handler),
            timeout=kwargs.get("timeout"),
        ),
    )

    parsed = llm_client.parse_structured(
        None,  # type: ignore[arg-type]
        schema=_Ping,
        system="Return JSON only.",
        user="Set word to ok",
        max_output_tokens=256,
    )

    assert parsed.word == "ok"
    assert captured["url"].endswith("models/gemini-3.6-flash:generateContent")
    assert (
        captured["body"]["generationConfig"]["responseMimeType"] == "application/json"
    )


def test_timeout_counts_as_llm_unavailability():
    assert caused_by_llm_unavailability(TimeoutError("timed out"))


def test_gemini_overload_counts_as_llm_unavailability():
    error = RuntimeError("unavailable")
    error.response = SimpleNamespace(
        status_code=503,
        json=lambda: {
            "error": {
                "code": 503,
                "message": "high demand",
                "status": "UNAVAILABLE",
            }
        },
    )
    wrapped = RuntimeError("Resume extraction failed")
    wrapped.__cause__ = error
    assert caused_by_llm_unavailability(wrapped)
