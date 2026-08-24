import httpx
from openai import OpenAI
from pydantic import BaseModel

from infrastructure.database.config import settings

_GEMINI_GENERATE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


def make_llm_client() -> OpenAI:
    options: dict = {
        "api_key": settings.llm_api_key,
        "timeout": settings.openai_timeout_seconds,
        "max_retries": 0,
    }
    if settings.llm_base_url:
        options["base_url"] = settings.llm_base_url
    return OpenAI(**options)


def parse_structured(
    client: OpenAI,
    *,
    schema: type[BaseModel],
    system: str,
    user: str,
    max_output_tokens: int,
) -> BaseModel:
    if settings.uses_gemini:
        return _parse_gemini(schema, system, user, max_output_tokens)

    if settings.llm_is_openai:
        response = client.responses.parse(
            model=settings.llm_model,
            instructions=system,
            input=user,
            text_format=schema,
            store=False,
            max_output_tokens=max_output_tokens,
        )
        parsed = response.output_parsed
        if parsed is None:
            raise RuntimeError("The language model did not return structured output")
        return parsed

    response = client.chat.completions.parse(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format=schema,
        max_completion_tokens=max_output_tokens,
        temperature=0,
    )
    parsed = response.choices[0].message.parsed
    if parsed is None:
        raise RuntimeError("The language model did not return structured output")
    return parsed


def _parse_gemini(
    schema: type[BaseModel],
    system: str,
    user: str,
    max_output_tokens: int,
) -> BaseModel:
    model = settings.llm_model.removeprefix("models/")
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
            "responseJsonSchema": schema.model_json_schema(),
        },
    }
    with httpx.Client(timeout=settings.openai_timeout_seconds) as http:
        response = http.post(
            _GEMINI_GENERATE_URL.format(model=model),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.llm_api_key,
            },
            json=payload,
        )
        response.raise_for_status()
    data = response.json()
    candidates = data.get("candidates") or []
    parts = (
        ((candidates[0].get("content") or {}).get("parts") or []) if candidates else []
    )
    text = "".join(str(part.get("text") or "") for part in parts)
    if not text.strip():
        raise RuntimeError("The language model did not return structured output")
    return schema.model_validate_json(text)
