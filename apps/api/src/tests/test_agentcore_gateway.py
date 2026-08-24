import json

from infrastructure.services.agentcore_gateway_retriever import (
    AgentCoreGatewayRetriever,
)


class _Http:
    def __init__(self, payloads: list[dict]):
        self.payloads = payloads
        self.calls: list[dict] = []

    def post(self, payload: dict) -> dict:
        self.calls.append(payload)
        return self.payloads.pop(0)


def test_retriever_calls_retrieve_and_extracts_chunk_text() -> None:
    http = _Http(
        [
            {"jsonrpc": "2.0", "id": "init", "result": {}},
            {"jsonrpc": "2.0", "id": "list", "result": {"tools": []}},
            {
                "jsonrpc": "2.0",
                "id": "call",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                {
                                    "retrievalResults": [
                                        {
                                            "content": {
                                                "text": "Python backend role at Astro"
                                            }
                                        },
                                        {"content": {"text": "   "}},
                                    ]
                                }
                            ),
                        }
                    ]
                },
            },
        ]
    )
    retriever = AgentCoreGatewayRetriever(
        gateway_url="https://example.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        tool_name="astrojobs-target___Retrieve",
        http_post=http.post,
    )

    snippets = retriever.retrieve("Engineer with Python and FastAPI", top_k=5)

    assert snippets == ["Python backend role at Astro"]
    assert http.calls[0]["method"] == "initialize"
    assert http.calls[1]["method"] == "tools/list"
    call = http.calls[2]
    assert call["method"] == "tools/call"
    assert call["params"]["name"] == "astrojobs-target___Retrieve"
    assert call["params"]["arguments"]["retrievalQuery"]["text"] == (
        "Engineer with Python and FastAPI"
    )


def test_retriever_uses_agentic_tool_when_listed() -> None:
    http = _Http(
        [
            {"jsonrpc": "2.0", "id": "init", "result": {}},
            {
                "jsonrpc": "2.0",
                "id": "list",
                "result": {
                    "tools": [{"name": "astrojobs-target___AgenticRetrieveStream"}]
                },
            },
            {
                "jsonrpc": "2.0",
                "id": "call",
                "result": {
                    "content": [
                        {"type": "text", "text": json.dumps({"output": "Hire Python"})}
                    ]
                },
            },
        ]
    )
    retriever = AgentCoreGatewayRetriever(
        gateway_url="https://example.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        tool_name="astrojobs-target___Retrieve",
        http_post=http.post,
    )
    assert retriever.retrieve("Python engineer") == ["Hire Python"]
    call = http.calls[2]
    assert call["params"]["name"] == "astrojobs-target___AgenticRetrieveStream"
    assert call["params"]["arguments"]["messages"][0]["content"]["text"] == (
        "Python engineer"
    )


def test_retriever_returns_empty_for_no_matches() -> None:
    http = _Http(
        [
            {"jsonrpc": "2.0", "id": "init", "result": {}},
            {"jsonrpc": "2.0", "id": "list", "result": {"tools": []}},
            {
                "jsonrpc": "2.0",
                "id": "call",
                "result": {
                    "content": [
                        {"type": "text", "text": '{"retrievalResults":[]}'},
                    ]
                },
            },
        ]
    )
    retriever = AgentCoreGatewayRetriever(
        gateway_url="https://example.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        tool_name="astrojobs-target___Retrieve",
        http_post=http.post,
    )
    assert retriever.retrieve("Python engineer") == []


def test_retriever_returns_empty_when_gateway_fails() -> None:
    def boom(_payload: dict) -> dict:
        raise RuntimeError("gateway down")

    retriever = AgentCoreGatewayRetriever(
        gateway_url="https://example.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp",
        tool_name="astrojobs-target___Retrieve",
        http_post=boom,
    )
    assert retriever.retrieve("Python engineer") == []
