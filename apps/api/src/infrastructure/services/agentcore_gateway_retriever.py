import json
import logging
from collections.abc import Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from boto3 import Session
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

from infrastructure.database.config import settings

logger = logging.getLogger(__name__)

MAX_QUERY_CHARS = 1_000
MAX_SNIPPET_CHARS = 2_000
_PROTOCOL = "2025-11-25"


class AgentCoreGatewayRetriever:
    def __init__(
        self,
        gateway_url: str,
        tool_name: str,
        region: str | None = None,
        http_post: Callable[[dict], dict] | None = None,
        timeout: float | None = None,
    ) -> None:
        self._url = gateway_url.rstrip("/")
        self._tool_name = tool_name
        self._region = region or settings.aws_region
        self._http_post = http_post or self._signed_post
        self._timeout = timeout or settings.openai_timeout_seconds

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        text = query.strip()[:MAX_QUERY_CHARS]
        if not text:
            return []
        try:
            self._rpc(
                "initialize",
                {
                    "protocolVersion": _PROTOCOL,
                    "capabilities": {},
                    "clientInfo": {"name": "astrojobs", "version": "0.1"},
                },
            )
            tool_name = self._resolve_tool()
            result = self._rpc(
                "tools/call",
                {"name": tool_name, "arguments": _tool_arguments(tool_name, text)},
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("AgentCore gateway retrieval failed: %s", exc)
            return []
        return _snippets(result)[:top_k]

    def _resolve_tool(self) -> str:
        listed = self._rpc("tools/list", {})
        names = [
            str(tool.get("name") or "")
            for tool in (listed.get("tools") or [])
            if isinstance(tool, dict)
        ]
        configured = self._tool_name.strip()
        if configured and (not names or configured in names):
            return configured
        for name in names:
            if name.endswith("___Retrieve") and "Agentic" not in name:
                return name
        for name in names:
            if "Retrieve" in name:
                return name
        if configured:
            return configured
        raise RuntimeError("AgentCore gateway has no Retrieve tool yet")

    def _rpc(self, method: str, params: dict) -> dict:
        response = self._http_post(
            {"jsonrpc": "2.0", "id": method, "method": method, "params": params}
        )
        error = response.get("error")
        if error:
            raise RuntimeError(str(error))
        result = response.get("result")
        return result if isinstance(result, dict) else {}

    def _signed_post(self, payload: dict) -> dict:
        body = json.dumps(payload).encode()
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": _PROTOCOL,
        }
        aws_request = AWSRequest(
            method="POST", url=self._url, data=body, headers=headers
        )
        credentials = Session().get_credentials()
        if credentials is None:
            raise RuntimeError("AWS credentials are not configured")
        SigV4Auth(
            credentials.get_frozen_credentials(),
            "bedrock-agentcore",
            self._region,
        ).add_auth(aws_request)
        request = Request(
            self._url,
            data=body,
            headers=dict(aws_request.headers),
            method="POST",
        )
        try:
            with urlopen(request, timeout=self._timeout) as response:
                return _parse_http_body(response.read().decode())
        except HTTPError as exc:
            detail = exc.read().decode()[:500]
            raise RuntimeError(f"gateway HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(str(exc.reason)) from exc


def _tool_arguments(tool_name: str, query: str) -> dict:
    if "AgenticRetrieve" in tool_name:
        return {
            "messages": [{"role": "user", "content": {"text": query}}],
        }
    return {"retrievalQuery": {"text": query}}


def _parse_http_body(raw: str) -> dict:
    text = raw.strip()
    if not text:
        return {}
    if text.startswith("{"):
        return json.loads(text)
    for line in text.splitlines():
        if line.startswith("data:"):
            payload = line[5:].strip()
            if payload and payload != "[DONE]":
                return json.loads(payload)
    return json.loads(text)


def _snippets(result: dict) -> list[str]:
    snippets: list[str] = []
    for item in result.get("content") or []:
        raw = item.get("text") if isinstance(item, dict) else str(item)
        snippets.extend(_from_payload(raw))
    return snippets


def _from_payload(raw: object) -> list[str]:
    text = str(raw or "").strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return [text[:MAX_SNIPPET_CHARS]]
    rows = []
    structured = False
    if isinstance(parsed, dict) and (
        "retrievalResults" in parsed or "chunks" in parsed
    ):
        rows = parsed.get("retrievalResults") or parsed.get("chunks") or []
        structured = True
    elif isinstance(parsed, list):
        rows = parsed
        structured = True
    if not structured:
        for key in ("output", "answer", "generatedText", "text"):
            value = parsed.get(key) if isinstance(parsed, dict) else None
            if isinstance(value, str) and value.strip():
                return [value.strip()[:MAX_SNIPPET_CHARS]]
        return [text[:MAX_SNIPPET_CHARS]]
    if not isinstance(rows, list) or not rows:
        return []
    snippets: list[str] = []
    for row in rows:
        if isinstance(row, str) and row.strip():
            snippets.append(row.strip()[:MAX_SNIPPET_CHARS])
            continue
        if not isinstance(row, dict):
            continue
        content = row.get("content") or row
        snippet = ""
        if isinstance(content, dict):
            snippet = str(content.get("text") or "").strip()
        elif isinstance(content, str):
            snippet = content.strip()
        if snippet:
            snippets.append(snippet[:MAX_SNIPPET_CHARS])
    return snippets
