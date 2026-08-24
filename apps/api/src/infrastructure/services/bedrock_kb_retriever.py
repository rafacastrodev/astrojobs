import logging
import os

import boto3
from botocore.config import Config

from infrastructure.database.config import settings

logger = logging.getLogger(__name__)

MAX_QUERY_CHARS = 1_000
MAX_SNIPPET_CHARS = 2_000


class BedrockKnowledgeBaseRetriever:
    def __init__(
        self,
        knowledge_base_id: str,
        region: str | None = None,
        client=None,
    ) -> None:
        self._knowledge_base_id = knowledge_base_id
        options: dict = {
            "region_name": region or settings.aws_region,
            "config": Config(
                read_timeout=int(settings.openai_timeout_seconds),
                retries={"max_attempts": 2, "mode": "standard"},
            ),
        }
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            options["aws_access_key_id"] = settings.aws_access_key_id
            options["aws_secret_access_key"] = settings.aws_secret_access_key
            if settings.aws_session_token:
                options["aws_session_token"] = settings.aws_session_token
        if client is not None:
            self._client = client
            return
        os.environ.pop("AWS_BEARER_TOKEN_BEDROCK", None)
        self._client = boto3.client("bedrock-agent-runtime", **options)

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        text = query.strip()[:MAX_QUERY_CHARS]
        if not text:
            return []
        try:
            response = self._client.retrieve(
                knowledgeBaseId=self._knowledge_base_id,
                retrievalQuery={"text": text},
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Bedrock Knowledge Base retrieve failed: %s", exc)
            return []
        snippets: list[str] = []
        for item in response.get("retrievalResults") or []:
            content = item.get("content") if isinstance(item, dict) else None
            snippet = ""
            if isinstance(content, dict):
                snippet = str(content.get("text") or "").strip()
            if snippet:
                snippets.append(snippet[:MAX_SNIPPET_CHARS])
        return snippets[:top_k]
