from datetime import UTC, datetime
from unittest.mock import Mock, patch

import pytest

from domain.notifications.errors import (
    NotificationConfigurationError,
    NotificationDeliveryError,
)
from domain.users.entities import UserEntity
from infrastructure.notifications.liveblocks_client import LiveblocksClient


def _user() -> UserEntity:
    return UserEntity(
        id=7,
        name="Ana",
        email="ana@example.com",
        hashed_password=None,
        role="professional",
        created_at=datetime(2026, 8, 24, tzinfo=UTC),
    )


def test_identify_user_uses_private_bearer_key_without_returning_it() -> None:
    response = Mock(content=b'{"token":"liveblocks-token"}')
    response.raise_for_status.return_value = None
    response.json.return_value = {"token": "liveblocks-token"}

    with patch(
        "infrastructure.notifications.liveblocks_client.httpx.post",
        return_value=response,
    ) as post:
        result = LiveblocksClient("sk_private").identify_user(_user())

    assert result == {"token": "liveblocks-token"}
    assert post.call_args.kwargs["headers"] == {"Authorization": "Bearer sk_private"}
    assert post.call_args.kwargs["json"]["userId"] == "astrojobs-user-7"
    assert "sk_private" not in str(result)


def test_missing_private_key_is_a_configuration_error() -> None:
    with pytest.raises(NotificationConfigurationError):
        LiveblocksClient("").identify_user(_user())


def test_http_failure_becomes_delivery_error() -> None:
    with (
        patch(
            "infrastructure.notifications.liveblocks_client.httpx.post",
            side_effect=__import__("httpx").ConnectError("offline"),
        ),
        pytest.raises(NotificationDeliveryError),
    ):
        LiveblocksClient("sk_private").identify_user(_user())
